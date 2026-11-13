import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import * as dotenv from 'dotenv';

dotenv.config();
process.env.SKIP_SERVER_LISTEN = '1';

import { app } from '../server.ts';
import { db } from '../src/db/index.ts';
import {
  users,
  tontines,
  tontineMembers,
  contributionPayments,
  walletTransactions,
} from '../src/db/schema.ts';
import { eq, inArray } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  signWebhookPayload,
} from '../src/server/security.ts';
import {
  createChainedLedgerEntry,
  verifyLedgerChainIntegrity,
} from '../src/utils/security.ts';

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ [PASS] ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, detail: err?.message || String(err) });
    console.error(`❌ [FAIL] ${name}: ${err?.message || err}`);
  }
}

async function httpJson(
  baseUrl: string,
  method: string,
  path: string,
  opts?: { body?: any; token?: string; headers?: Record<string, string>; rawBody?: string }
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    ...(opts?.headers || {}),
  };

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: opts?.rawBody ?? (opts?.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, data: json };
}

async function main() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const createdUserUids: string[] = [];
  const createdTontineIds: string[] = [];

  try {
    console.log(`\n🔐 Démarrage de la Suite de Tests de Sécurité Tontine 2.0 (${baseUrl})\n`);

    // =========================================================================
    // BLOC 1 : CRYPTOGRAPHIE & AUTHENTIFICATION
    // =========================================================================
    await runTest('T1.1 Hachage scrypt avec sel aléatoire & vérification temps constant', () => {
      const h1 = hashPassword('SecretTontine2026!');
      const h2 = hashPassword('SecretTontine2026!');
      assert.ok(h1.startsWith('scrypt$'));
      assert.notEqual(h1, h2, 'Deux hachages du même mot de passe doivent avoir un sel distinct');
      assert.equal(verifyPassword('SecretTontine2026!', h1), true);
      assert.equal(verifyPassword('MauvaisMotDePasse', h1), false);
    });

    await runTest('T1.2 Jetons serveur HMAC-SHA256 : validation, anti-falsification & expiration', () => {
      const validToken = signSessionToken({ uid: 'u-test-1', email: 'a@b.sn', role: 'MANAGER' }, 300);
      const decoded = verifySessionToken(validToken);
      assert.ok(decoded);
      assert.equal(decoded!.uid, 'u-test-1');

      // Falsification du payload (elevation de rôle)
      const parts = validToken.split('.');
      const forgedPayload = Buffer.from(
        JSON.stringify({ uid: 'u-admin', email: 'a@b.sn', role: 'MANAGER', iat: 1, exp: 9999999999 })
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;
      assert.equal(verifySessionToken(tamperedToken), null, 'Un jeton falsifié doit être rejeté');

      // Jeton expiré
      const expiredToken = signSessionToken({ uid: 'u-test-1', email: 'a@b.sn', role: 'MEMBER' }, -5);
      assert.equal(verifySessionToken(expiredToken), null, 'Un jeton expiré doit être rejeté');
    });

    const suffix = crypto.randomUUID().slice(0, 8);
    let mgrAToken = '';
    let mgrAUid = '';
    let mgrBToken = '';
    let mgrBUid = '';
    let mbr1Token = '';
    let mbr1Uid = '';
    let mbr2Token = '';
    let mbr2Uid = '';

    await runTest('T1.3 Inscription sécurisée (/api/auth/register) & absence de fuite passwordHash', async () => {
      const regA = await httpJson(baseUrl, 'POST', '/api/auth/register', {
        body: {
          email: `sec-mgr-a-${suffix}@test.sn`,
          phone: `+22177${Math.floor(1000000 + Math.random() * 8999999)}`,
          password: 'MgrAPassword#2026',
          firstName: 'SecManager',
          lastName: 'Alpha',
          role: 'MANAGER',
        },
      });
      assert.equal(regA.status, 201);
      assert.ok(regA.data.token);
      assert.equal(regA.data.user.passwordHash, undefined, 'passwordHash ne doit jamais être exposé');
      mgrAToken = regA.data.token;
      mgrAUid = regA.data.user.uid;
      createdUserUids.push(mgrAUid);

      const regB = await httpJson(baseUrl, 'POST', '/api/auth/register', {
        body: {
          email: `sec-mgr-b-${suffix}@test.sn`,
          phone: `+22178${Math.floor(1000000 + Math.random() * 8999999)}`,
          password: 'MgrBPassword#2026',
          firstName: 'SecManager',
          lastName: 'Beta',
          role: 'MANAGER',
        },
      });
      assert.equal(regB.status, 201);
      mgrBToken = regB.data.token;
      mgrBUid = regB.data.user.uid;
      createdUserUids.push(mgrBUid);

      const regM1 = await httpJson(baseUrl, 'POST', '/api/auth/register', {
        body: {
          email: `sec-mbr-1-${suffix}@test.sn`,
          phone: `+22507${Math.floor(10000000 + Math.random() * 89999999)}`,
          password: 'Mbr1Password#2026',
          firstName: 'SecMember',
          lastName: 'One',
          role: 'MEMBER',
        },
      });
      assert.equal(regM1.status, 201);
      mbr1Token = regM1.data.token;
      mbr1Uid = regM1.data.user.uid;
      createdUserUids.push(mbr1Uid);

      const regM2 = await httpJson(baseUrl, 'POST', '/api/auth/register', {
        body: {
          email: `sec-mbr-2-${suffix}@test.sn`,
          phone: `+22505${Math.floor(10000000 + Math.random() * 89999999)}`,
          password: 'Mbr2Password#2026',
          firstName: 'SecMember',
          lastName: 'Two',
          role: 'MEMBER',
        },
      });
      assert.equal(regM2.status, 201);
      mbr2Token = regM2.data.token;
      mbr2Uid = regM2.data.user.uid;
      createdUserUids.push(mbr2Uid);

      // Verify passwordHash is stored in PostgreSQL & NOT exposed in GET /api/users
      const [dbUser] = await db.select().from(users).where(eq(users.uid, mgrAUid));
      assert.ok(dbUser.passwordHash?.startsWith('scrypt$'));

      const usersRes = await httpJson(baseUrl, 'GET', '/api/users', { token: mgrAToken });
      assert.equal(usersRes.status, 200);
      assert.ok(Array.isArray(usersRes.data));
      assert.equal(
        usersRes.data.some((u: any) => 'passwordHash' in u),
        false,
        'GET /api/users ne doit jamais exposer passwordHash'
      );
    });

    await runTest('T1.4 Connexion (/api/auth/login) : succès valide & rejet 401 mauvais mot de passe', async () => {
      const okLogin = await httpJson(baseUrl, 'POST', '/api/auth/login', {
        body: { identifier: `sec-mgr-a-${suffix}@test.sn`, password: 'MgrAPassword#2026' },
      });
      assert.equal(okLogin.status, 200);
      assert.ok(okLogin.data.token);

      const badLogin = await httpJson(baseUrl, 'POST', '/api/auth/login', {
        body: { identifier: `sec-mgr-a-${suffix}@test.sn`, password: 'WrongPassword!' },
      });
      assert.equal(badLogin.status, 401);
    });

    // =========================================================================
    // BLOC 2 : CONTRÔLE D'ACCÈS, ANTI-IDOR & ANTI-BOLA
    // =========================================================================
    const testTontineId = `tnt-sec-${suffix}`;
    createdTontineIds.push(testTontineId);

    await runTest('T2.1 Rejet 401 des requêtes anonymes sur toutes les routes sensibles', async () => {
      const endpoints: Array<[string, string, any?]> = [
        ['GET', '/api/users'],
        ['GET', '/api/tontines'],
        ['POST', '/api/tontines', { tontine: { id: 'x', name: 'y' } }],
        ['POST', `/api/tontines/${testTontineId}/payout`, { roundNumber: 1 }],
        ['POST', '/api/wallet/withdraw', { amount: 1000, provider: 'ORANGE_MONEY', destinationAccount: '77' }],
        ['GET', '/api/payments/saspay/config'],
        ['POST', '/api/payments/saspay/disburse', { amount: 1000, recipientPhone: '77' }],
      ];
      for (const [m, p, b] of endpoints) {
        const res = await httpJson(baseUrl, m, p, b ? { body: b } : undefined);
        assert.equal(res.status, 401, `${m} ${p} doit retourner 401 sans jeton`);
      }
    });

    await runTest('T2.2 Création de tontine par Manager A & blocage 403 si Membre tente de créer/retirer', async () => {
      const memberCreateAttempt = await httpJson(baseUrl, 'POST', '/api/tontines', {
        token: mbr1Token,
        body: {
          tontine: {
            id: `tnt-hack-${suffix}`,
            code: `HACK-${suffix}`,
            name: 'Illegal Tontine',
            contributionAmount: 10000,
            totalRounds: 3,
          },
          members: [],
        },
      });
      assert.equal(memberCreateAttempt.status, 403);

      const memberWithdrawAttempt = await httpJson(baseUrl, 'POST', '/api/wallet/withdraw', {
        token: mbr1Token,
        body: { amount: 5000, provider: 'ORANGE_MONEY', destinationAccount: '+22507000000' },
      });
      assert.equal(memberWithdrawAttempt.status, 403);

      const createRes = await httpJson(baseUrl, 'POST', '/api/tontines', {
        token: mgrAToken,
        body: {
          tontine: {
            id: testTontineId,
            code: `SEC-${suffix}`,
            name: 'Tontine Audit Sécurité',
            managerId: mgrAUid,
            contributionAmount: 50000,
            totalRounds: 3,
            commissionRate: '0.04',
          },
          members: [
            {
              id: `tm-sec-1-${suffix}`,
              tontineId: testTontineId,
              userId: mbr1Uid,
              name: 'SecMember One',
              phone: '+22507000001',
              turnNumber: 1,
              hasPaidCurrentRound: false,
              isCurrentBeneficiary: true,
              paymentMethod: 'MOOV_MONEY',
            },
          ],
        },
      });
      assert.equal(createRes.status, 201);
    });

    await runTest('T2.3 Anti-IDOR Inter-Gestionnaires : Manager B bloqué (403) sur tontine/wallet Manager A', async () => {
      const idorPayout = await httpJson(baseUrl, 'POST', `/api/tontines/${testTontineId}/payout`, {
        token: mgrBToken,
        body: { roundNumber: 1 },
      });
      assert.equal(idorPayout.status, 403);

      const idorRisk = await httpJson(baseUrl, 'PATCH', `/api/tontines/${testTontineId}/risk-config`, {
        token: mgrBToken,
        body: { latePenaltyPerDay: 2500 },
      });
      assert.equal(idorRisk.status, 403);

      const idorWithdraw = await httpJson(baseUrl, 'POST', '/api/wallet/withdraw', {
        token: mgrBToken,
        body: { managerId: mgrAUid, amount: 1000, provider: 'ORANGE_MONEY', destinationAccount: '+22177' },
      });
      assert.equal(idorWithdraw.status, 403);
    });

    await runTest('T2.4 Anti-BOLA : Non-membre (Member 2) bloqué (403) sur paiement & usurpation identité', async () => {
      const nonMemberPay = await httpJson(baseUrl, 'POST', `/api/tontines/${testTontineId}/pay`, {
        token: mbr2Token,
        body: {
          paymentData: {
            roundNumber: 1,
            amount: 50000,
            date: new Date().toISOString(),
            paymentMethod: 'MOOV_MONEY',
            transactionRef: `REF-UNAUTH-${suffix}`,
          },
        },
      });
      assert.equal(nonMemberPay.status, 403);

      // Spoof attempt: mbr2 tries paying as mbr1
      const spoofPay = await httpJson(baseUrl, 'POST', `/api/tontines/${testTontineId}/pay`, {
        token: mbr2Token,
        body: {
          memberUserId: mbr1Uid,
          paymentData: {
            roundNumber: 1,
            amount: 50000,
            date: new Date().toISOString(),
            paymentMethod: 'MOOV_MONEY',
            transactionRef: `REF-SPOOF-${suffix}`,
          },
        },
      });
      assert.equal(spoofPay.status, 403);
    });

    // =========================================================================
    // BLOC 3 : INTÉGRITÉ FINANCIÈRE, CONCURRENCE & TRANSACTIONS ACID POSTGRESQL
    // =========================================================================
    await runTest('T3.1 Validation stricte des montants : rejet montants négatifs, nuls et décimaux', async () => {
      await db
        .update(users)
        .set({ walletBalance: 100000, kycStatus: 'VERIFIED' })
        .where(eq(users.uid, mgrAUid));

      for (const badAmount of [-50000, 0, 125.75, 'hack']) {
        const res = await httpJson(baseUrl, 'POST', '/api/wallet/withdraw', {
          token: mgrAToken,
          body: { amount: badAmount, provider: 'ORANGE_MONEY', destinationAccount: '+221770001122' },
        });
        assert.equal(res.status, 400, `Montant invalide (${badAmount}) doit retourner 400`);
      }

      // Reject unsupported payment operator (only MOOV_MONEY & ORANGE_MONEY allowed)
      const unsupportedProviderRes = await httpJson(baseUrl, 'POST', '/api/wallet/withdraw', {
        token: mgrAToken,
        body: { amount: 5000, provider: 'WAVE', destinationAccount: '+221770001122' },
      });
      assert.equal(unsupportedProviderRes.status, 400, 'Un opérateur hors Moov Money / Orange Money doit être rejeté');

      const [mgrRow] = await db.select().from(users).where(eq(users.uid, mgrAUid));
      assert.equal(mgrRow.walletBalance, 100000, 'Le solde ne doit pas changer après montants invalides');
    });

    await runTest('T3.2 Rejet retrait supérieur au solde disponible', async () => {
      const res = await httpJson(baseUrl, 'POST', '/api/wallet/withdraw', {
        token: mgrAToken,
        body: { amount: 250000, provider: 'ORANGE_MONEY', destinationAccount: '+221770001122' },
      });
      assert.equal(res.status, 400);
      const [mgrRow] = await db.select().from(users).where(eq(users.uid, mgrAUid));
      assert.equal(mgrRow.walletBalance, 100000);
    });

    await runTest('T3.3 Test de Course Concurrente (Double-Spend) : 2 retraits simultanés de 80k sur 100k', async () => {
      await db
        .update(users)
        .set({ walletBalance: 100000, kycStatus: 'VERIFIED' })
        .where(eq(users.uid, mgrAUid));

      const [r1, r2] = await Promise.all([
        httpJson(baseUrl, 'POST', '/api/wallet/withdraw', {
          token: mgrAToken,
          body: { amount: 80000, provider: 'MOOV_MONEY', destinationAccount: '+221770001122' },
        }),
        httpJson(baseUrl, 'POST', '/api/wallet/withdraw', {
          token: mgrAToken,
          body: { amount: 80000, provider: 'MOOV_MONEY', destinationAccount: '+221770001122' },
        }),
      ]);

      const statuses = [r1.status, r2.status].sort();
      assert.equal(statuses.filter((s) => s === 200).length, 1, 'Un seul retrait concurrent doit réussir');
      assert.equal(statuses.filter((s) => s >= 400).length, 1, 'Le second retrait doit être bloqué');

      const [mgrRow] = await db.select().from(users).where(eq(users.uid, mgrAUid));
      assert.equal(mgrRow.walletBalance, 20000, 'Solde exact attendu = 20 000 F (jamais négatif)');
    });

    await runTest('T3.4 Conformité BCEAO KYC : blocage 403 > 150 000 F pour compte non vérifié', async () => {
      await db
        .update(users)
        .set({ walletBalance: 200000, kycStatus: 'UNVERIFIED' })
        .where(eq(users.uid, mgrBUid));

      const overKyc = await httpJson(baseUrl, 'POST', '/api/wallet/withdraw', {
        token: mgrBToken,
        body: { amount: 160000, provider: 'ORANGE_MONEY', destinationAccount: '+221780001122' },
      });
      assert.equal(overKyc.status, 403);
    });

    await runTest('T3.5 Anti-Double Versement (Payout Replay) : 2 versements simultanés du Tour #1', async () => {
      const [mgrBefore] = await db.select().from(users).where(eq(users.uid, mgrAUid));
      const balanceBefore = mgrBefore.walletBalance;

      const [p1, p2] = await Promise.all([
        httpJson(baseUrl, 'POST', `/api/tontines/${testTontineId}/payout`, {
          token: mgrAToken,
          body: { roundNumber: 1 },
        }),
        httpJson(baseUrl, 'POST', `/api/tontines/${testTontineId}/payout`, {
          token: mgrAToken,
          body: { roundNumber: 1 },
        }),
      ]);

      const okCount = [p1, p2].filter((r) => r.status === 200).length;
      const errCount = [p1, p2].filter((r) => r.status === 409).length;
      assert.equal(okCount, 1, 'Un seul payout du Tour #1 doit réussir');
      assert.equal(errCount, 1, 'Le replay simultané du Tour #1 doit être bloqué en 409');

      // Verify commission credited strictly once (50000 * 1 member * 0.04 = 2000)
      const [mgrAfter] = await db.select().from(users).where(eq(users.uid, mgrAUid));
      assert.equal(mgrAfter.walletBalance, balanceBefore + 2000);
    });

    await runTest('T3.6 Anti-Double Cotisation & Conflit de Tour (SQL Unique Constraints)', async () => {
      // Member 2 joins on Turn 2
      const joinRes = await httpJson(baseUrl, 'POST', `/api/tontines/${testTontineId}/join`, {
        token: mbr2Token,
        body: {
          name: 'SecMember Two',
          phone: '+22505000002',
          turnNumber: 2,
          paymentMethod: 'ORANGE_MONEY',
        },
      });
      assert.equal(joinRes.status, 201);

      // Member 1 tries taking Turn 2 (occupied by Member 2) -> 409 Conflict
      const turnConflict = await httpJson(baseUrl, 'PATCH', `/api/tontines/${testTontineId}/turn`, {
        token: mbr1Token,
        body: { newTurnNumber: 2 },
      });
      assert.equal(turnConflict.status, 409);

      // Member 1 pays Round 2 twice concurrently -> 1 succeeds (201), 1 rejected (409)
      const [pay1, pay2] = await Promise.all([
        httpJson(baseUrl, 'POST', `/api/tontines/${testTontineId}/pay`, {
          token: mbr1Token,
          body: {
            paymentData: {
              roundNumber: 2,
              amount: 50000,
              date: new Date().toISOString(),
              paymentMethod: 'MOOV_MONEY',
              transactionRef: `PAY-R2-A-${suffix}`,
            },
          },
        }),
        httpJson(baseUrl, 'POST', `/api/tontines/${testTontineId}/pay`, {
          token: mbr1Token,
          body: {
            paymentData: {
              roundNumber: 2,
              amount: 50000,
              date: new Date().toISOString(),
              paymentMethod: 'MOOV_MONEY',
              transactionRef: `PAY-R2-B-${suffix}`,
            },
          },
        }),
      ]);

      const paySuccess = [pay1, pay2].filter((r) => r.status === 201).length;
      const payConflict = [pay1, pay2].filter((r) => r.status === 409).length;
      assert.equal(paySuccess, 1, 'Une seule cotisation doit être acceptée pour le Tour #2');
      assert.equal(payConflict, 1, 'Le doublon concurrent doit être rejeté avec 409');
    });

    // =========================================================================
    // BLOC 4 : WEBHOOKS HMAC, ANTI-MASS-ASSIGNMENT, SQLI & GRAND LIVRE
    // =========================================================================
    await runTest('T4.1 Webhooks : rejet 401 signature absente, forgée ou expirée ; 200 si HMAC valide', async () => {
      const secret = process.env.SASPAY_WEBHOOK_SECRET || 'whsec_saspay_tontine_signature_secret_key_2026';
      const payloadObj = {
        MerchantCode: 'SAS-TONTINE-88210',
        CheckoutRequestID: `SAS-SEC-${suffix}`,
        ResultCode: 0,
        Amount: 50000,
        tontineId: testTontineId,
        memberUserId: mbr2Uid,
        roundNumber: 2,
      };
      const rawBody = JSON.stringify(payloadObj);

      // 1. Missing headers -> 401
      const noSig = await httpJson(baseUrl, 'POST', '/api/payments/saspay/webhook', { rawBody });
      assert.equal(noSig.status, 401);

      // 2. Forged signature -> 401
      const forged = await httpJson(baseUrl, 'POST', '/api/payments/saspay/webhook', {
        rawBody,
        headers: {
          'x-webhook-timestamp': String(Date.now()),
          'x-saspay-signature': 'sha256=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        },
      });
      assert.equal(forged.status, 401);

      // 3. Expired timestamp (replay attack: 10 minutes old) -> 401
      const oldTs = Date.now() - 10 * 60 * 1000;
      const expiredSig = signWebhookPayload(rawBody, secret, oldTs);
      const replay = await httpJson(baseUrl, 'POST', '/api/payments/saspay/webhook', {
        rawBody,
        headers: {
          'x-webhook-timestamp': String(oldTs),
          'x-saspay-signature': `sha256=${expiredSig}`,
        },
      });
      assert.equal(replay.status, 401);

      // 4. Valid HMAC + fresh timestamp -> 200 & payment recorded atomically
      const freshTs = Date.now();
      const validSig = signWebhookPayload(rawBody, secret, freshTs);
      const validRes = await httpJson(baseUrl, 'POST', '/api/payments/saspay/webhook', {
        rawBody,
        headers: {
          'x-webhook-timestamp': String(freshTs),
          'x-saspay-signature': `sha256=${validSig}`,
        },
      });
      assert.equal(validRes.status, 200);
    });

    await runTest('T4.2 Anti-Mass-Assignment : blocage des champs critiques sur PATCH risk-config', async () => {
      const res = await httpJson(baseUrl, 'PATCH', `/api/tontines/${testTontineId}/risk-config`, {
        token: mgrAToken,
        body: {
          managerId: 'hacker-uid',
          currentRound: 999,
          status: 'COMPLETED',
          latePenaltyPerDay: 1500,
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.managerId, mgrAUid, 'managerId ne doit pas être modifiable via risk-config');
      assert.equal(res.data.currentRound, 2, 'currentRound ne doit pas être modifiable via risk-config');
      assert.equal(res.data.latePenaltyPerDay, 1500);
    });

    await runTest('T4.3 Protection Injection SQL & intégrité du schéma', async () => {
      const sqliRes = await httpJson(baseUrl, 'POST', '/api/auth/login', {
        body: {
          identifier: "'; DROP TABLE users; --",
          password: "' OR '1'='1",
        },
      });
      assert.equal(sqliRes.status, 401);

      const checkUsers = await db.select({ uid: users.uid }).from(users).limit(5);
      assert.ok(checkUsers.length > 0, 'La table users doit rester intacte après tentative SQLi');
    });

    await runTest('T4.4 Chaîne Cryptographique SHA-256 du Grand Livre : détection d\'altération', async () => {
      const e1 = await createChainedLedgerEntry({
        id: 'led-1',
        type: 'COMMISSION',
        amount: 2000,
        initiator: mgrAUid,
        target: 'WALLET',
        description: 'Commission Tour 1',
      });
      const e2 = await createChainedLedgerEntry({
        id: 'led-2',
        previousEntry: e1,
        type: 'WITHDRAWAL',
        amount: 1500,
        initiator: mgrAUid,
        target: 'MOOV_MONEY',
        description: 'Retrait Moov Money',
      });

      const validAudit = await verifyLedgerChainIntegrity([e1, e2]);
      assert.equal(validAudit.isTamperFree, true);

      // Tamper retroactively with amount on entry 1
      const tampered = [{ ...e1, amount: 999999 }, e2];
      const brokenAudit = await verifyLedgerChainIntegrity(tampered);
      assert.equal(brokenAudit.isTamperFree, false);
      assert.equal(brokenAudit.brokenEntryIndex, 0);
    });
  } finally {
    // Cleanup ephemeral test fixtures so Cloud SQL stays pristine
    try {
      if (createdTontineIds.length > 0) {
        await db.delete(contributionPayments).where(inArray(contributionPayments.tontineId, createdTontineIds));
        await db.delete(tontineMembers).where(inArray(tontineMembers.tontineId, createdTontineIds));
        await db.delete(walletTransactions).where(inArray(walletTransactions.tontineId, createdTontineIds));
        await db.delete(tontines).where(inArray(tontines.id, createdTontineIds));
      }
      if (createdUserUids.length > 0) {
        await db.delete(walletTransactions).where(inArray(walletTransactions.managerId, createdUserUids));
        await db.delete(users).where(inArray(users.uid, createdUserUids));
      }
    } catch (cleanupErr) {
      console.warn('Nettoyage test:', cleanupErr);
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n📊 Résumé Sécurité : ${passed}/${results.length} tests réussis, ${failed} échec(s).\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal security suite error:', err);
  process.exit(1);
});

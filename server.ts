import express, { Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getAllUsers,
  getUserByUid,
  getOrCreateUser,
  registerUserAuth,
  authenticateUserAuth,
  getAllTontinesWithMembers,
  createTontineWithMembers,
  joinTontine,
  recordPayment,
  payoutBeneficiary,
  updateMemberTurn,
  updateTontineRiskConfig,
  updateMemberRiskData,
  withdrawManagerWallet,
  triggerAutomatedCron,
  getCronLogs,
} from './src/db/services.ts';
import { seedInitialDataIfEmpty } from './src/db/seed.ts';
import { requireAuth, requireManagerRole, AuthRequest } from './src/middleware/auth.ts';
import {
  AppSecurityError,
  assertPositiveIntegerAmount,
  signSessionToken,
  verifyServerWebhookSignature,
} from './src/server/security.ts';

export const app = express();
const PORT = 3000;

app.use(
  express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

function sendRouteError(res: Response, error: any, fallbackMessage: string) {
  if (error instanceof AppSecurityError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  const pgCode = error?.code || error?.cause?.code;
  if (pgCode === '23505') {
    return res.status(409).json({
      error: 'Conflit d\'unicité : cette opération ou cotisation existe déjà en base.',
    });
  }
  if (pgCode === '23503') {
    return res.status(400).json({
      error: 'Référence invalide : entité liée introuvable.',
    });
  }
  return res.status(500).json({ error: error?.message || fallbackMessage });
}

// ============================================================================
// HEALTH CHECK (Non-sensitive aggregate only)
// ============================================================================
app.get('/api/health', async (_req, res) => {
  try {
    const usersList = await getAllUsers();
    res.json({
      status: 'ok',
      database: 'Cloud SQL PostgreSQL (europe-west2)',
      usersCount: usersList.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      database: 'Cloud SQL connection issue',
      error: error?.message || 'Database error',
    });
  }
});

// ============================================================================
// AUTHENTICATION ROUTES (SCRYPT HASHING + SERVER-SIGNED HMAC-SHA256 TOKENS)
// ============================================================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      email,
      phone,
      password,
      firstName,
      lastName,
      role,
      managerPlanCode,
      memberPaymentMethod,
    } = req.body || {};

    const user = await registerUserAuth({
      email,
      phone,
      password,
      firstName,
      lastName,
      role: role === 'MANAGER' ? 'MANAGER' : 'MEMBER',
      managerPlanCode,
      memberPaymentMethod,
    });

    const token = signSessionToken({
      uid: user.uid,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({ token, user });
  } catch (error: any) {
    sendRouteError(res, error, 'Échec de création du compte.');
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
    }

    const user = await authenticateUserAuth(identifier, password);
    if (!user) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    const token = signSessionToken({
      uid: user.uid,
      email: user.email,
      role: user.role,
    });

    res.json({ token, user });
  } catch (error: any) {
    sendRouteError(res, error, 'Échec d\'authentification.');
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getUserByUid(req.user!.uid);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    res.json({ user });
  } catch (error: any) {
    sendRouteError(res, error, 'Impossible de récupérer le profil connecté.');
  }
});

// ============================================================================
// USERS ROUTES (PROTECTED + SAFE PROJECTION)
// ============================================================================
app.get('/api/users', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const usersList = await getAllUsers();
    res.json(usersList);
  } catch (error: any) {
    sendRouteError(res, error, 'Impossible de récupérer les utilisateurs.');
  }
});

app.post('/api/users/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { uid, email, phone, firstName, lastName, role, kycStatus, managerPlanCode, memberPaymentMethod } = req.body || {};
    const authenticatedUid = req.user!.uid;

    if (uid && uid !== authenticatedUid) {
      return res.status(403).json({
        error: 'Accès refusé : impossible de synchroniser le profil d\'un autre utilisateur.',
      });
    }

    const effectiveEmail = req.user?.email || email;
    if (!effectiveEmail) {
      return res.status(400).json({ error: 'Email utilisateur manquant.' });
    }

    const user = await getOrCreateUser({
      uid: authenticatedUid,
      email: effectiveEmail,
      phone,
      firstName: firstName || 'Utilisateur',
      lastName: lastName || '',
      role: req.user?.role || role || 'MEMBER',
      kycStatus,
      managerPlanCode,
      memberPaymentMethod,
    });

    res.json(user);
  } catch (error: any) {
    sendRouteError(res, error, 'Échec de synchronisation du profil.');
  }
});

// ============================================================================
// TONTINES & FINANCIAL ROUTES (PROTECTED + ANTI-IDOR + ACID TRANSACTIONS)
// ============================================================================
app.get('/api/tontines', requireAuth, async (req: AuthRequest, res) => {
  try {
    const tontinesList = await getAllTontinesWithMembers(req.user!.uid);
    res.json(tontinesList);
  } catch (error: any) {
    sendRouteError(res, error, 'Impossible de charger les tontines.');
  }
});

app.post('/api/tontines', requireAuth, requireManagerRole, async (req: AuthRequest, res) => {
  try {
    const { tontine, members } = req.body || {};
    if (!tontine || !tontine.id || !tontine.name) {
      return res.status(400).json({ error: 'Données de tontine invalides.' });
    }

    if (tontine.managerId && tontine.managerId !== req.user!.uid) {
      return res.status(403).json({
        error: 'Accès refusé : impossible de créer une tontine pour un autre gestionnaire.',
      });
    }

    const created = await createTontineWithMembers(
      { ...tontine, managerId: req.user!.uid },
      members || [],
      req.user!.uid
    );
    res.status(201).json(created);
  } catch (error: any) {
    sendRouteError(res, error, 'Impossible de créer la tontine.');
  }
});

app.post('/api/tontines/:id/join', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const memberData = req.body || {};

    if (memberData.userId && memberData.userId !== req.user!.uid) {
      return res.status(403).json({
        error: 'Accès refusé : vous ne pouvez inscrire que votre propre compte.',
      });
    }

    const joined = await joinTontine(id, memberData, req.user!.uid);
    res.status(201).json(joined);
  } catch (error: any) {
    sendRouteError(res, error, 'Impossible de rejoindre la tontine.');
  }
});

app.post('/api/tontines/:id/pay', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { paymentData, memberUserId } = req.body || {};

    if (memberUserId && memberUserId !== req.user!.uid) {
      return res.status(403).json({
        error: 'Accès refusé : vous ne pouvez enregistrer un paiement que pour votre propre compte.',
      });
    }

    if (!paymentData) {
      return res.status(400).json({ error: 'Données de paiement manquantes.' });
    }

    const payment = await recordPayment(paymentData, id, req.user!.uid);
    res.status(201).json(payment);
  } catch (error: any) {
    sendRouteError(res, error, 'Échec de l\'enregistrement de la cotisation.');
  }
});

app.post('/api/tontines/:id/payout', requireAuth, requireManagerRole, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { roundNumber, managerId, commissionAmount } = req.body || {};

    if (managerId && managerId !== req.user!.uid) {
      return res.status(403).json({
        error: 'Accès refusé : usurpation d\'identifiant gestionnaire bloquée.',
      });
    }

    const result = await payoutBeneficiary(id, roundNumber, req.user!.uid, commissionAmount);
    res.json(result);
  } catch (error: any) {
    sendRouteError(res, error, 'Échec du versement de la cagnotte.');
  }
});

app.patch('/api/tontines/:id/turn', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { memberUserId, newTurnNumber } = req.body || {};
    const targetMemberUid = memberUserId || req.user!.uid;

    const updated = await updateMemberTurn(id, targetMemberUid, newTurnNumber, req.user!.uid);
    res.json(updated);
  } catch (error: any) {
    sendRouteError(res, error, 'Impossible de mettre à jour le tour du membre.');
  }
});

app.patch('/api/tontines/:id/risk-config', requireAuth, requireManagerRole, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updated = await updateTontineRiskConfig(id, req.body, req.user!.uid);
    res.json(updated);
  } catch (error: any) {
    sendRouteError(res, error, 'Impossible de mettre à jour la configuration de risque.');
  }
});

app.patch('/api/tontines/:id/members/:memberId/risk', requireAuth, requireManagerRole, async (req: AuthRequest, res) => {
  try {
    const { id, memberId } = req.params;
    const updated = await updateMemberRiskData(id, memberId, req.body, req.user!.uid);
    res.json(updated);
  } catch (error: any) {
    sendRouteError(res, error, 'Impossible de mettre à jour les données de risque du membre.');
  }
});

// ============================================================================
// WALLET WITHDRAWAL (PROTECTED + ACID + BCEAO KYC GUARD)
// ============================================================================
app.post('/api/wallet/withdraw', requireAuth, requireManagerRole, async (req: AuthRequest, res) => {
  try {
    const { managerId, amount, provider, destinationAccount } = req.body || {};

    if (managerId && managerId !== req.user!.uid) {
      return res.status(403).json({
        error: 'Accès refusé : impossible d\'effectuer un retrait sur le portefeuille d\'un autre gestionnaire.',
      });
    }

    const tx = await withdrawManagerWallet(req.user!.uid, amount, provider, destinationAccount);
    res.json(tx);
  } catch (error: any) {
    sendRouteError(res, error, 'Échec du retrait du portefeuille.');
  }
});

// ============================================================================
// PAYMENT API & CRYPTOGRAPHICALLY VERIFIED WEBHOOKS
// ============================================================================
const recentPaymentWebhooks: any[] = [];
const recentSaspayWebhooks: any[] = [];

let saspayServerConfig = {
  merchantCode: process.env.SASPAY_MERCHANT_CODE || 'SAS-TONTINE-88210',
  clientId: process.env.SASPAY_CLIENT_ID || 'sas_live_client_uemoa_99a8b7c',
  clientSecret: process.env.SASPAY_CLIENT_SECRET || 'sas_sec_44f8e912c0a98ef2',
  environment: 'sandbox',
  currency: 'XOF',
  webhookSecret:
    process.env.SASPAY_WEBHOOK_SECRET || 'whsec_saspay_tontine_signature_secret_key_2026',
  autoSettleTontineRound: true,
  status: 'ACTIVE',
};

function maskSecret(val: string): string {
  if (!val || val.length <= 8) return '********';
  return `${val.slice(0, 6)}...${val.slice(-4)}`;
}

app.get('/api/payments/gateway-info', requireAuth, (_req: AuthRequest, res) => {
  res.json({
    status: 'ACTIVE',
    primaryGateway: 'Saspay Multi-Operator Gateway (UEMOA & Pan-African)',
    webhookEndpoint: '/api/payments/webhook',
    saspayWebhookEndpoint: '/api/payments/saspay/webhook',
    supportedGateways: [
      'Orange Money',
      'Moov Money',
      'Saspay Gateway (Moov Money & Orange Money)',
    ],
    saspayConfig: {
      merchantCode: saspayServerConfig.merchantCode,
      environment: saspayServerConfig.environment,
      currency: saspayServerConfig.currency,
      status: saspayServerConfig.status,
    },
    recentWebhooksCount: recentPaymentWebhooks.length + recentSaspayWebhooks.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/payments/saspay/config', requireAuth, requireManagerRole, (_req: AuthRequest, res) => {
  res.json({
    merchantCode: saspayServerConfig.merchantCode,
    clientId: saspayServerConfig.clientId,
    clientSecret: maskSecret(saspayServerConfig.clientSecret),
    environment: saspayServerConfig.environment,
    currency: saspayServerConfig.currency,
    webhookSecret: maskSecret(saspayServerConfig.webhookSecret),
    autoSettleTontineRound: saspayServerConfig.autoSettleTontineRound,
    status: saspayServerConfig.status,
    webhookEndpoint: '/api/payments/saspay/webhook',
    recentLogsCount: recentSaspayWebhooks.length,
  });
});

app.post('/api/payments/saspay/config', requireAuth, requireManagerRole, (req: AuthRequest, res) => {
  const body = req.body || {};
  if (typeof body.merchantCode === 'string' && body.merchantCode.trim()) {
    saspayServerConfig.merchantCode = body.merchantCode.trim();
  }
  if (typeof body.clientId === 'string' && body.clientId.trim()) {
    saspayServerConfig.clientId = body.clientId.trim();
  }
  if (typeof body.clientSecret === 'string' && body.clientSecret.trim() && !body.clientSecret.includes('...')) {
    saspayServerConfig.clientSecret = body.clientSecret.trim();
  }
  if (typeof body.environment === 'string' && ['sandbox', 'live'].includes(body.environment)) {
    saspayServerConfig.environment = body.environment;
  }
  if (typeof body.currency === 'string' && ['XOF', 'KES', 'USD'].includes(body.currency)) {
    saspayServerConfig.currency = body.currency;
  }
  if (typeof body.webhookSecret === 'string' && body.webhookSecret.trim() && !body.webhookSecret.includes('...')) {
    saspayServerConfig.webhookSecret = body.webhookSecret.trim();
  }
  if (typeof body.autoSettleTontineRound === 'boolean') {
    saspayServerConfig.autoSettleTontineRound = body.autoSettleTontineRound;
  }

  res.json({
    success: true,
    message: 'Configuration Saspay mise à jour avec succès.',
    config: {
      merchantCode: saspayServerConfig.merchantCode,
      clientId: saspayServerConfig.clientId,
      clientSecret: maskSecret(saspayServerConfig.clientSecret),
      environment: saspayServerConfig.environment,
      currency: saspayServerConfig.currency,
      webhookSecret: maskSecret(saspayServerConfig.webhookSecret),
      autoSettleTontineRound: saspayServerConfig.autoSettleTontineRound,
      status: saspayServerConfig.status,
    },
  });
});

app.post('/api/payments/saspay/initiate', requireAuth, (req: AuthRequest, res) => {
  try {
    const { amount, currency, phoneNumber, customerName, tontineId, roundNumber } = req.body || {};
    const validAmount = assertPositiveIntegerAmount(Number(amount), 'amount', 100);

    const checkoutRequestId = `SAS-CHK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const billRef = `TONT-${(tontineId || 'GRP').slice(0, 6).toUpperCase()}-R${roundNumber || 1}`;

    res.status(200).json({
      success: true,
      checkoutRequestId,
      merchantCode: saspayServerConfig.merchantCode,
      amount: validAmount,
      currency: currency || saspayServerConfig.currency,
      environment: saspayServerConfig.environment,
      billRefNumber: billRef,
      checkoutUrl: `https://${saspayServerConfig.environment === 'sandbox' ? 'sandbox.' : ''}saspay.app/pay/${checkoutRequestId}`,
      instructions: `Demande de débit Saspay initiée pour ${customerName || 'le cotisant'}. Un prompt USSD / Push sécurisé a été transmis au ${phoneNumber || 'numéro associé'}.`,
      status: 'INITIATED',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    sendRouteError(res, error, 'Erreur lors de l\'initiation Saspay.');
  }
});

// Cryptographically Verified Saspay Webhook Callback (HMAC-SHA256 + Timestamp Anti-Replay)
app.post('/api/payments/saspay/webhook', async (req: any, res) => {
  try {
    const rawBody: string = req.rawBody ?? JSON.stringify(req.body || {});
    const signature = (req.headers['x-saspay-signature'] || req.headers['x-webhook-signature']) as string | undefined;
    const timestampHeader = (req.headers['x-webhook-timestamp'] ||
      req.headers['x-saspay-timestamp'] ||
      req.body?.timestamp ||
      req.body?.TransactionDate) as string | undefined;

    const verification = verifyServerWebhookSignature({
      rawBody,
      providedSignature: signature,
      timestampHeader,
      secretKey: saspayServerConfig.webhookSecret,
    });

    if (!verification.isValid) {
      return res.status(401).json({
        ResultCode: 1,
        code: verification.code,
        error: verification.message,
      });
    }

    const payload = req.body || {};
    const {
      MerchantCode,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      Amount,
      Msisdn,
      tontineId,
      memberUserId,
      memberName,
      roundNumber,
    } = payload;

    const isSuccess = ResultCode === 0 || ResultCode === '0';

    const logItem = {
      id: `sas-wh-${Date.now()}`,
      receivedAt: new Date().toISOString(),
      provider: 'SASPAY',
      merchantCode: MerchantCode || saspayServerConfig.merchantCode,
      checkoutRequestId: CheckoutRequestID || `SAS-${Date.now()}`,
      amount: Number(Amount) || 0,
      msisdn: Msisdn || '',
      resultCode: ResultCode ?? 0,
      resultDesc: ResultDesc || 'Succès de transaction Saspay',
      signatureVerified: true,
      tontineId,
      memberUserId,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
    };

    recentSaspayWebhooks.unshift(logItem);
    if (recentSaspayWebhooks.length > 50) recentSaspayWebhooks.pop();

    if (isSuccess && tontineId && memberUserId && Amount !== undefined) {
      const validAmount = assertPositiveIntegerAmount(Number(Amount), 'Amount', 1);
      const paymentRecord = {
        id: `pay-saspay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tontineId,
        memberUserId,
        memberName: memberName || `Cotisant Saspay (${Msisdn || 'Mobile'})`,
        roundNumber: Number(roundNumber) || 1,
        amount: validAmount,
        date: new Date().toISOString(),
        paymentMethod: 'SASPAY',
        transactionRef: CheckoutRequestID || `SAS-${Date.now()}`,
        status: 'SUCCESS',
      };

      await recordPayment(paymentRecord, tontineId, memberUserId);
    }

    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Saspay webhook verified and processed successfully',
      checkoutRequestId: CheckoutRequestID,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    sendRouteError(res, error, 'Failed to process Saspay webhook');
  }
});

// Saspay B2C Disbursement (Manager Only)
app.post('/api/payments/saspay/disburse', requireAuth, requireManagerRole, async (req: AuthRequest, res) => {
  try {
    const { amount, recipientPhone, recipientName } = req.body || {};
    const validAmount = assertPositiveIntegerAmount(Number(amount), 'amount', 100);
    if (!recipientPhone) {
      return res.status(400).json({ error: 'Téléphone du destinataire requis pour Saspay B2C' });
    }

    const disbursementRef = `SAS-B2C-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    res.status(200).json({
      success: true,
      transactionRef: disbursementRef,
      amount: validAmount,
      currency: saspayServerConfig.currency,
      recipientPhone,
      recipientName: recipientName || 'Bénéficiaire Tontine',
      status: 'DISBURSED',
      message: `Virement sortant Saspay B2C de ${validAmount} ${saspayServerConfig.currency} exécuté avec succès vers ${recipientPhone}.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    sendRouteError(res, error, 'Erreur lors du décaissement Saspay B2C');
  }
});

// Generic Payment Webhook (Cryptographically Verified HMAC-SHA256 + Timestamp Anti-Replay)
app.post('/api/payments/webhook', async (req: any, res) => {
  try {
    const rawBody: string = req.rawBody ?? JSON.stringify(req.body || {});
    const signature = req.headers['x-webhook-signature'] as string | undefined;
    const timestampHeader = (req.headers['x-webhook-timestamp'] || req.body?.timestamp) as string | undefined;

    const verification = verifyServerWebhookSignature({
      rawBody,
      providedSignature: signature,
      timestampHeader,
      secretKey: saspayServerConfig.webhookSecret,
    });

    if (!verification.isValid) {
      return res.status(401).json({
        received: false,
        code: verification.code,
        error: verification.message,
      });
    }

    const payload = req.body || {};
    const { tontineId, memberUserId, memberName, amount, provider, transactionRef, roundNumber } = payload;

    const logItem = {
      id: `wh-${Date.now()}`,
      receivedAt: new Date().toISOString(),
      payload,
      signatureVerified: true,
      status: 'PROCESSED',
    };
    recentPaymentWebhooks.unshift(logItem);
    if (recentPaymentWebhooks.length > 50) recentPaymentWebhooks.pop();

    if (tontineId && memberUserId && amount !== undefined) {
      const validAmount = assertPositiveIntegerAmount(Number(amount), 'amount', 1);
      const paymentRecord = {
        id: `pay-api-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tontineId,
        memberUserId,
        memberName: memberName || 'Cotisant Mobile Money',
        roundNumber: Number(roundNumber) || 1,
        amount: validAmount,
        date: new Date().toISOString(),
        paymentMethod: provider || 'ORANGE_MONEY',
        transactionRef: transactionRef || `API-${Date.now()}`,
        status: 'SUCCESS',
      };

      await recordPayment(paymentRecord, tontineId, memberUserId);
    }

    res.status(200).json({
      received: true,
      status: 'PROCESSED',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    sendRouteError(res, error, 'Failed to process webhook');
  }
});

app.post('/api/payments/initiate', requireAuth, (req: AuthRequest, res) => {
  try {
    const { amount, provider, memberPhone } = req.body || {};
    const validAmount = assertPositiveIntegerAmount(Number(amount), 'amount', 100);
    const transactionRef = `${(provider || 'PAY').slice(0, 3).toUpperCase()}-TX-${Date.now()}`;
    res.json({
      success: true,
      transactionRef,
      amount: validAmount,
      provider,
      checkoutUrl: `https://pay.tontine.app/checkout/${transactionRef}`,
      instructions: `Paiement initié avec succès vers ${memberPhone || 'votre mobile'}. Veuillez approuver la notification push sur votre téléphone.`,
    });
  } catch (error: any) {
    sendRouteError(res, error, 'Erreur lors de l\'initiation du paiement.');
  }
});

// ============================================================================
// CRON & BACKGROUND TASKS (MANAGER ONLY)
// ============================================================================
app.post('/api/cron/trigger', requireAuth, requireManagerRole, async (_req: AuthRequest, res) => {
  try {
    const log = await triggerAutomatedCron();
    res.json(log);
  } catch (error: any) {
    sendRouteError(res, error, 'Failed to trigger cron');
  }
});

app.get('/api/cron/logs', requireAuth, requireManagerRole, async (_req: AuthRequest, res) => {
  try {
    const logs = await getCronLogs();
    res.json(logs);
  } catch (error: any) {
    sendRouteError(res, error, 'Failed to get cron logs');
  }
});

export async function startServer() {
  // Seed initial data and backfill scrypt password hashes if needed
  await seedInitialDataIfEmpty();

  // Schedule automated background job every hour
  setInterval(async () => {
    try {
      await triggerAutomatedCron();
    } catch {
      // Background cron non-fatal
    }
  }, 60 * 60 * 1000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloud SQL & API Server running on port ${PORT}`);
  });
}

if (process.env.SKIP_SERVER_LISTEN !== '1') {
  startServer();
}

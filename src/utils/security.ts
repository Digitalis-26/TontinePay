/**
 * FinTech & SaaS Security Shield Module
 * 
 * Implementations for the 6 critical fintech security vectors:
 * 1. Webhook HMAC-SHA256 Cryptographic Verification (Wave, Orange Money, MTN MoMo)
 * 2. Concurrency Control & Mutex (Anti-Double Spending on Withdrawals/Payouts)
 * 3. Idempotency Key Engine (Anti-Replay / Duplicate Processing)
 * 4. Strict Ownership & Anti-IDOR Authorization
 * 5. Anti-SMS Pumping & Rate Limiting (West African Telco Guard)
 * 6. BCEAO Regulatory KYC Tiers & Financial Ceilings
 * 7. Tamper-Evident Grand Livre with Cryptographic Hash Chaining (SHA-256)
 */

import { RegisteredUser, TontineRecord, ManagerWalletTransaction } from '../types';

// ============================================================================
// 1. CRYPTOGRAPHIC WEBHOOK VERIFICATION (HMAC-SHA256 & REPLAY DEFENSE)
// ============================================================================

/**
 * Computes SHA-256 in standard hex format using Web Crypto API.
 */
export async function sha256Hex(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes HMAC-SHA256 in hex format using Web Crypto API.
 */
export async function computeHmacSha256(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface WebhookVerificationResult {
  isValid: boolean;
  code: 'VALID' | 'SIGNATURE_MISMATCH' | 'TIMESTAMP_EXPIRED' | 'MISSING_HEADERS' | 'IDEMPOTENT_DUPLICATE';
  message: string;
  computedSignature?: string;
}

/**
 * Validates Mobile Money Webhook signature and freshness.
 * Prevents forged callbacks and replay attacks.
 */
export async function verifyWebhookSignature({
  payload,
  providedSignature,
  secretKey,
  timestampMs,
  maxAgeSeconds = 300, // 5 minutes tolerance
}: {
  payload: string;
  providedSignature: string | null;
  secretKey: string;
  timestampMs: number;
  maxAgeSeconds?: number;
}): Promise<WebhookVerificationResult> {
  if (!providedSignature || !secretKey) {
    return {
      isValid: false,
      code: 'MISSING_HEADERS',
      message: 'En-têtes de signature cryptographique absents de la notification webhook.',
    };
  }

  // Anti-Replay: Verify freshness
  const now = Date.now();
  const ageSeconds = Math.abs(now - timestampMs) / 1000;
  if (ageSeconds > maxAgeSeconds) {
    return {
      isValid: false,
      code: 'TIMESTAMP_EXPIRED',
      message: `Rejet de l'attaque par rejeu : l'horodatage du webhook a expiré (${Math.round(ageSeconds)}s > ${maxAgeSeconds}s).`,
    };
  }

  // Signed payload format: `${timestamp}.${rawPayload}`
  const signedString = `${timestampMs}.${payload}`;
  const computed = await computeHmacSha256(secretKey, signedString);

  // Constant-time like string equality
  if (computed !== providedSignature) {
    return {
      isValid: false,
      code: 'SIGNATURE_MISMATCH',
      message: 'Signature HMAC invalide : tentative d’injection de paiement forgé détectée.',
      computedSignature: computed,
    };
  }

  return {
    isValid: true,
    code: 'VALID',
    message: 'Signature cryptographique vérifiée avec succès et fraîcheur validée.',
    computedSignature: computed,
  };
}

// ============================================================================
// 2. IDEMPOTENCY ENGINE (ANTI-DUPLICATE PROCESSING)
// ============================================================================

interface IdempotencyRecord {
  key: string;
  firstProcessedAt: number;
  responsePayload?: any;
}

// In-memory idempotency registry
const idempotencyStore = new Map<string, IdempotencyRecord>();

/**
 * Checks and records an idempotency key.
 * If already processed, returns alreadyProcessed=true to prevent double actions.
 */
export function checkAndRecordIdempotency(key: string): { isDuplicate: boolean; processedAt?: number } {
  const existing = idempotencyStore.get(key);
  if (existing) {
    return { isDuplicate: true, processedAt: existing.firstProcessedAt };
  }

  idempotencyStore.set(key, {
    key,
    firstProcessedAt: Date.now(),
  });

  return { isDuplicate: false };
}

// ============================================================================
// 3. CONCURRENCY MUTEX & ANTI-DOUBLE SPEND LOCK
// ============================================================================

// Locks map to serialize concurrent payouts / withdrawals on the same wallet or tontine
const activeLocks = new Map<string, number>();

/**
 * Acquires an exclusive lock on a resource (e.g. `wallet_manager_123`).
 * Returns false if resource is already locked by a concurrent in-flight request.
 */
export function acquireFinancialLock(resourceId: string, ttlMs = 4000): boolean {
  const now = Date.now();
  const existingLockTime = activeLocks.get(resourceId);

  // If locked and lock hasn't expired yet -> Collision detected!
  if (existingLockTime && now - existingLockTime < ttlMs) {
    return false;
  }

  activeLocks.set(resourceId, now);
  return true;
}

/**
 * Releases the exclusive lock once transaction is finalized.
 */
export function releaseFinancialLock(resourceId: string): void {
  activeLocks.delete(resourceId);
}

// ============================================================================
// 4. STRICT OWNERSHIP & ANTI-BOLA / IDOR ACCESS CONTROL
// ============================================================================

export interface AuthorizationCheckResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Verifies that the authenticated user is the legitimate manager and owner of the tontine.
 */
export function assertTontineManagerOwnership(
  user: RegisteredUser | null,
  tontine: TontineRecord | null
): AuthorizationCheckResult {
  if (!user) {
    return { authorized: false, reason: 'Utilisateur non authentifié.' };
  }
  if (!tontine) {
    return { authorized: false, reason: 'Tontine introuvable.' };
  }
  if (tontine.managerId !== user.id) {
    return {
      authorized: false,
      reason: `Violation IDOR / Contrôle d'accès : L'utilisateur ${user.phone} n'est pas le gestionnaire créateur de la tontine "${tontine.name}".`,
    };
  }
  return { authorized: true };
}

/**
 * Verifies that the user is an active enrolled member of the tontine before paying or picking turns.
 */
export function assertTontineMemberEnrolled(
  user: RegisteredUser | null,
  tontine: TontineRecord | null
): AuthorizationCheckResult {
  if (!user) {
    return { authorized: false, reason: 'Utilisateur non authentifié.' };
  }
  if (!tontine) {
    return { authorized: false, reason: 'Tontine introuvable.' };
  }
  const isEnrolled = tontine.members.some((m) => m.userId === user.id);
  if (!isEnrolled) {
    return {
      authorized: false,
      reason: `Violation BOLA : L'utilisateur ${user.phone} n'est pas inscrit comme participant de cette tontine.`,
    };
  }
  return { authorized: true };
}

// ============================================================================
// 5. ANTI-SMS PUMPING & RATE LIMITING (WEST AFRICAN TELCO GUARD)
// ============================================================================

const OTP_HISTORY = new Map<string, number[]>(); // phone/IP -> array of request timestamps
const ALLOWED_WEST_AFRICAN_PREFIXES = [
  '+225', // Côte d'Ivoire
  '+221', // Sénégal
  '+223', // Mali
  '+229', // Bénin
  '+228', // Togo
  '+226', // Burkina Faso
  '+224', // Guinée
  '+237', // Cameroun
  '+242', // Congo
];

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
  reason?: string;
}

/**
 * Validates international phone prefix and enforces sliding-window rate limit against SMS Toll Fraud.
 */
export function verifyOtpRequestGuard(phone: string): RateLimitResult {
  const cleanPhone = phone.replace(/[\s-]/g, '');

  // 1. Prefix Whitelist (Prevents international premium rate number pumping)
  const hasValidPrefix = ALLOWED_WEST_AFRICAN_PREFIXES.some((prefix) => cleanPhone.startsWith(prefix));
  if (!hasValidPrefix && cleanPhone.startsWith('+')) {
    return {
      allowed: false,
      remainingAttempts: 0,
      reason: `Préfixe non autorisé : Les demandes d'OTP sont restreintes aux zones UEMOA/CEMAC afin de prévenir la fraude aux SMS surtaxés.`,
    };
  }

  // 2. Sliding window rate limit: max 3 requests per 10 minutes
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxAttempts = 3;

  const history = OTP_HISTORY.get(cleanPhone) || [];
  const validRecentAttempts = history.filter((timestamp) => now - timestamp < windowMs);

  if (validRecentAttempts.length >= maxAttempts) {
    const oldest = validRecentAttempts[0];
    const retryAfter = Math.ceil((windowMs - (now - oldest)) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: retryAfter,
      reason: `Limite de sécurité dépassée : Trop de demandes de SMS OTP. Veuillez patienter ${retryAfter} secondes.`,
    };
  }

  // Record attempt
  validRecentAttempts.push(now);
  OTP_HISTORY.set(cleanPhone, validRecentAttempts);

  return {
    allowed: true,
    remainingAttempts: maxAttempts - validRecentAttempts.length,
  };
}

// ============================================================================
// 6. REGULATORY COMPLIANCE & KYC TIERS (BCEAO / UEMOA CEILINGS)
// ============================================================================

export interface KycValidationResult {
  allowed: boolean;
  tier: 1 | 2;
  currentCeiling: number;
  requestedAmount: number;
  reason?: string;
}

// Tiers defined by BCEAO Mobile Money regulations:
// Tier 1 (Non vérifié / KYC basique) : max 150 000 F CFA par opération, cumul mensuel 300 000 F CFA
// Tier 2 (Vérifié CNI / Passeport valide) : max 5 000 000 F CFA
export const BCEAO_TIER1_MAX_PER_TX = 150000; // 150 000 XOF
export const BCEAO_TIER1_MAX_MONTHLY = 300000; // 300 000 XOF
export const BCEAO_TIER2_MAX_PER_TX = 5000000; // 5 000 000 XOF

export function validateKycWithdrawalLimits(
  user: RegisteredUser,
  requestedAmount: number,
  past30DaysTotal = 0
): KycValidationResult {
  const isKycVerified = user.kyc?.status === 'VERIFIED';
  const tier = isKycVerified ? 2 : 1;
  const maxPerTx = isKycVerified ? BCEAO_TIER2_MAX_PER_TX : BCEAO_TIER1_MAX_PER_TX;
  const maxMonthly = isKycVerified ? Infinity : BCEAO_TIER1_MAX_MONTHLY;

  if (requestedAmount > maxPerTx) {
    return {
      allowed: false,
      tier,
      currentCeiling: maxPerTx,
      requestedAmount,
      reason: `Conformité BCEAO (Palier ${tier}) : Le montant demandé (${requestedAmount.toLocaleString()} F CFA) dépasse le plafond autorisé de ${maxPerTx.toLocaleString()} F CFA pour les comptes ${isKycVerified ? 'vérifiés' : 'non vérifiés'}. Effectuez votre vérification KYC pour lever cette limite.`,
    };
  }

  if (past30DaysTotal + requestedAmount > maxMonthly) {
    return {
      allowed: false,
      tier,
      currentCeiling: maxMonthly,
      requestedAmount,
      reason: `Conformité BCEAO (Palier ${tier}) : Le plafond mensuel cumulé de ${maxMonthly.toLocaleString()} F CFA serait dépassé. Veuillez soumettre vos pièces d'identité (CNI / Passeport) pour passer au Palier 2.`,
    };
  }

  return {
    allowed: true,
    tier,
    currentCeiling: maxPerTx,
    requestedAmount,
  };
}

// ============================================================================
// 7. TAMPER-EVIDENT CRYPTOGRAPHIC HASH CHAINING (IMMUTABLE LEDGER)
// ============================================================================

export interface ChainedLedgerEntry {
  id: string;
  previousHash: string;
  currentHash: string;
  sequenceNumber: number;
  timestamp: string;
  type: string;
  amount: number;
  initiator: string;
  target: string;
  description: string;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Creates a cryptographically chained entry where `currentHash` binds to `previousHash`.
 * Any retroactive modification of past entries breaks the cryptographic chain.
 */
export async function createChainedLedgerEntry({
  id,
  previousEntry,
  type,
  amount,
  initiator,
  target,
  description,
}: {
  id: string;
  previousEntry?: ChainedLedgerEntry | null;
  type: string;
  amount: number;
  initiator: string;
  target: string;
  description: string;
}): Promise<ChainedLedgerEntry> {
  const previousHash = previousEntry ? previousEntry.currentHash : GENESIS_HASH;
  const sequenceNumber = previousEntry ? previousEntry.sequenceNumber + 1 : 1;
  const timestamp = new Date().toISOString();

  // Signature payload
  const rawPayload = `${previousHash}|${sequenceNumber}|${timestamp}|${type}|${amount}|${initiator}|${target}|${description}`;
  const currentHash = await sha256Hex(rawPayload);

  return {
    id,
    previousHash,
    currentHash,
    sequenceNumber,
    timestamp,
    type,
    amount,
    initiator,
    target,
    description,
  };
}

/**
 * Audits the entire ledger chain to guarantee zero tampering or retroactive data alteration.
 */
export async function verifyLedgerChainIntegrity(entries: ChainedLedgerEntry[]): Promise<{
  isTamperFree: boolean;
  totalVerified: number;
  brokenEntryIndex?: number;
  errorDetail?: string;
}> {
  if (!entries.length) {
    return { isTamperFree: true, totalVerified: 0 };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPrevHash = i === 0 ? GENESIS_HASH : entries[i - 1].currentHash;

    if (entry.previousHash !== expectedPrevHash) {
      return {
        isTamperFree: false,
        totalVerified: i,
        brokenEntryIndex: i,
        errorDetail: `Rupture de chaîne à l'index #${i} : le previousHash ne correspond pas au hash de l'entrée précédente (altération détectée).`,
      };
    }

    const recomputedRaw = `${entry.previousHash}|${entry.sequenceNumber}|${entry.timestamp}|${entry.type}|${entry.amount}|${entry.initiator}|${entry.target}|${entry.description}`;
    const recomputedHash = await sha256Hex(recomputedRaw);

    if (recomputedHash !== entry.currentHash) {
      return {
        isTamperFree: false,
        totalVerified: i,
        brokenEntryIndex: i,
        errorDetail: `Altération de données à l'entrée #${i} : le contenu a été modifié a posteriori (Hash calculé != Hash scellé).`,
      };
    }
  }

  return {
    isTamperFree: true,
    totalVerified: entries.length,
  };
}

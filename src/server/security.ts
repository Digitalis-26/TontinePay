import crypto from 'crypto';

// ============================================================================
// 1. CRYPTOGRAPHIC PASSWORD HASHING (SCRYPT + RANDOM SALT + TIMING-SAFE EQUAL)
// ============================================================================

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_KEY_LEN = 64;
const SCRYPT_COST = 16384; // N=2^14
const SCRYPT_BLOCK_SIZE = 8; // r=8
const SCRYPT_PARALLELISM = 1; // p=1

export function hashPassword(plainPassword: string): string {
  if (!plainPassword || plainPassword.length < 4) {
    throw new Error('Le mot de passe doit contenir au moins 4 caractères.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, SCRYPT_KEY_LEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELISM,
  });
  return `${SCRYPT_PREFIX}$${salt}$${derived.toString('hex')}`;
}

export function verifyPassword(plainPassword: string, storedHash: string | null | undefined): boolean {
  if (!plainPassword || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== SCRYPT_PREFIX) {
    return false;
  }

  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const derivedBuf = crypto.scryptSync(plainPassword, salt, expectedBuf.length, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELISM,
    });
    if (derivedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

// ============================================================================
// 2. SERVER-SIGNED SESSION TOKENS (HMAC-SHA256)
// ============================================================================

export interface SessionTokenPayload {
  uid: string;
  email: string;
  role: 'MANAGER' | 'MEMBER' | string;
  iat: number;
  exp: number;
}

declare global {
  var __tontineSessionSecret: string | undefined;
}

export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  if (!globalThis.__tontineSessionSecret) {
    // Ephemeral CSPRNG secret for runtime signing when SESSION_SECRET env is absent
    globalThis.__tontineSessionSecret = crypto.randomBytes(48).toString('hex');
  }
  return globalThis.__tontineSessionSecret;
}

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(input: string): string {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function signSessionToken(
  user: { uid: string; email: string; role: string },
  ttlSeconds = 60 * 60 * 24 // 24h
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadObj: SessionTokenPayload = {
    uid: user.uid,
    email: user.email,
    role: user.role,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  const payload = toBase64Url(JSON.stringify(payloadObj));
  const signingInput = `${header}.${payload}`;
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(signingInput)
    .digest();
  return `${signingInput}.${toBase64Url(signature)}`;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, providedSig] = parts;
  if (!header || !payload || !providedSig) return null;

  try {
    const signingInput = `${header}.${payload}`;
    const expectedSigBuf = crypto
      .createHmac('sha256', getSessionSecret())
      .update(signingInput)
      .digest();
    const expectedSigStr = toBase64Url(expectedSigBuf);

    const a = Buffer.from(providedSig, 'utf8');
    const b = Buffer.from(expectedSigStr, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decoded = JSON.parse(fromBase64Url(payload)) as SessionTokenPayload;
    if (!decoded || typeof decoded.uid !== 'string' || typeof decoded.exp !== 'number') {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

// ============================================================================
// 3. SERVER-SIDE WEBHOOK HMAC-SHA256 & ANTI-REPLAY VERIFICATION
// ============================================================================

export function signWebhookPayload(
  rawBody: string,
  secretKey: string,
  timestampMs: number = Date.now()
): string {
  const signedString = `${timestampMs}.${rawBody}`;
  return crypto.createHmac('sha256', secretKey).update(signedString).digest('hex');
}

export interface ServerWebhookVerificationResult {
  isValid: boolean;
  code: 'VALID' | 'MISSING_HEADERS' | 'TIMESTAMP_EXPIRED' | 'SIGNATURE_MISMATCH';
  message: string;
}

export function verifyServerWebhookSignature({
  rawBody,
  providedSignature,
  timestampHeader,
  secretKey,
  maxAgeSeconds = 300,
}: {
  rawBody: string;
  providedSignature: string | undefined;
  timestampHeader: string | number | undefined;
  secretKey: string;
  maxAgeSeconds?: number;
}): ServerWebhookVerificationResult {
  if (!providedSignature || !secretKey || timestampHeader === undefined || timestampHeader === '') {
    return {
      isValid: false,
      code: 'MISSING_HEADERS',
      message: 'En-têtes de signature HMAC ou horodatage manquants.',
    };
  }

  const normalizedSig = providedSignature.startsWith('sha256=')
    ? providedSignature.slice(7).trim().toLowerCase()
    : providedSignature.trim().toLowerCase();

  const timestampMs =
    typeof timestampHeader === 'number'
      ? timestampHeader
      : /^\d+$/.test(String(timestampHeader))
        ? Number(timestampHeader)
        : Date.parse(String(timestampHeader));

  if (!Number.isFinite(timestampMs)) {
    return {
      isValid: false,
      code: 'MISSING_HEADERS',
      message: 'Horodatage de webhook invalide.',
    };
  }

  const ageSeconds = Math.abs(Date.now() - timestampMs) / 1000;
  if (ageSeconds > maxAgeSeconds) {
    return {
      isValid: false,
      code: 'TIMESTAMP_EXPIRED',
      message: `Horodatage expiré (${Math.round(ageSeconds)}s > ${maxAgeSeconds}s) — attaque par rejeu bloquée.`,
    };
  }

  const expectedHex = signWebhookPayload(rawBody, secretKey, timestampMs).toLowerCase();
  const providedBuf = Buffer.from(normalizedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedHex, 'utf8');

  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return {
      isValid: false,
      code: 'SIGNATURE_MISMATCH',
      message: 'Signature HMAC-SHA256 invalide : notification webhook rejetée.',
    };
  }

  return {
    isValid: true,
    code: 'VALID',
    message: 'Signature HMAC-SHA256 et horodatage validés.',
  };
}

// ============================================================================
// 4. INPUT VALIDATORS, ALLOWLISTS & SANITIZERS (ANTI-MASS-ASSIGNMENT)
// ============================================================================

export class AppSecurityError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppSecurityError';
    this.statusCode = statusCode;
  }
}

export function assertPositiveIntegerAmount(
  amount: unknown,
  fieldName = 'amount',
  min = 1,
  max = 100_000_000
): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new AppSecurityError(`Le champ "${fieldName}" doit être un entier positif valide.`, 400);
  }
  if (amount < min || amount > max) {
    throw new AppSecurityError(
      `Le champ "${fieldName}" doit être compris entre ${min} et ${max}.`,
      400
    );
  }
  return amount;
}

export function sanitizeUserForPublic<T extends Record<string, any>>(user: T): Omit<T, 'passwordHash' | 'password' | 'pinCode'> {
  if (!user || typeof user !== 'object') return user;
  const { passwordHash: _ph, password: _pw, pinCode: _pin, ...safe } = user;
  return safe;
}

export function pickAllowedTontineRiskUpdates(body: Record<string, any>) {
  const allowed: Record<string, any> = {};
  if (typeof body.cautionRequired === 'boolean') allowed.cautionRequired = body.cautionRequired;
  if (typeof body.escrowCautionEnabled === 'boolean') allowed.cautionRequired = body.escrowCautionEnabled;
  if (typeof body.cautionAmount === 'number' && Number.isInteger(body.cautionAmount) && body.cautionAmount >= 0) {
    allowed.cautionAmount = body.cautionAmount;
  }
  if (typeof body.cautionPerMember === 'number' && Number.isInteger(body.cautionPerMember) && body.cautionPerMember >= 0) {
    allowed.cautionAmount = body.cautionPerMember;
  }
  if (typeof body.cautionRule === 'string' && ['ONE_ROUND_ADVANCE', 'FIXED', 'NONE'].includes(body.cautionRule)) {
    allowed.cautionRule = body.cautionRule;
  }
  if (typeof body.latePenaltyPerDay === 'number' && Number.isInteger(body.latePenaltyPerDay) && body.latePenaltyPerDay >= 0) {
    allowed.latePenaltyPerDay = body.latePenaltyPerDay;
  }
  if (typeof body.penaltyPerDay === 'number' && Number.isInteger(body.penaltyPerDay) && body.penaltyPerDay >= 0) {
    allowed.latePenaltyPerDay = body.penaltyPerDay;
  }
  if (typeof body.lateGraceDays === 'number' && Number.isInteger(body.lateGraceDays) && body.lateGraceDays >= 0 && body.lateGraceDays <= 30) {
    allowed.lateGraceDays = body.lateGraceDays;
  }
  if (typeof body.gracePeriodDays === 'number' && Number.isInteger(body.gracePeriodDays) && body.gracePeriodDays >= 0 && body.gracePeriodDays <= 30) {
    allowed.lateGraceDays = body.gracePeriodDays;
  }
  if (typeof body.penaltyRecipient === 'string' && ['POT', 'MANAGER'].includes(body.penaltyRecipient)) {
    allowed.penaltyRecipient = body.penaltyRecipient;
  }
  if (typeof body.penaltyDestination === 'string') {
    allowed.penaltyRecipient = body.penaltyDestination === 'MANAGER' ? 'MANAGER' : 'POT';
  }
  if (typeof body.requireGuarantorForEarlyRounds === 'boolean') {
    allowed.requireGuarantorForEarlyRounds = body.requireGuarantorForEarlyRounds;
  }
  if (typeof body.guarantorRequiredForPriorityRounds === 'boolean') {
    allowed.requireGuarantorForEarlyRounds = body.guarantorRequiredForPriorityRounds;
  }
  if (typeof body.earlyRoundsThreshold === 'number' && Number.isInteger(body.earlyRoundsThreshold) && body.earlyRoundsThreshold >= 1 && body.earlyRoundsThreshold <= 10) {
    allowed.earlyRoundsThreshold = body.earlyRoundsThreshold;
  }
  return allowed;
}

export function pickAllowedMemberRiskUpdates(body: Record<string, any>) {
  const allowed: Record<string, any> = {};
  if (typeof body.cautionStatus === 'string' && ['ESCROWED', 'RELEASED', 'FORFEITED', 'EXEMPT'].includes(body.cautionStatus)) {
    allowed.cautionStatus = body.cautionStatus;
  }
  if (typeof body.cautionAmount === 'number' && Number.isInteger(body.cautionAmount) && body.cautionAmount >= 0) {
    allowed.cautionAmount = body.cautionAmount;
  }
  if (typeof body.guarantorName === 'string') {
    allowed.guarantorName = body.guarantorName.trim().slice(0, 120);
  }
  if (typeof body.guarantorPhone === 'string') {
    allowed.guarantorPhone = body.guarantorPhone.trim().slice(0, 32);
  }
  if (typeof body.guarantorRelationship === 'string') {
    allowed.guarantorRelationship = body.guarantorRelationship.trim().slice(0, 80);
  }
  if (typeof body.guarantorVerified === 'boolean') {
    allowed.guarantorVerified = body.guarantorVerified;
  }
  if (typeof body.guarantorStatus === 'string') {
    allowed.guarantorVerified = body.guarantorStatus === 'VERIFIED';
  }
  if (typeof body.tontineScore === 'number' && Number.isInteger(body.tontineScore) && body.tontineScore >= 0 && body.tontineScore <= 100) {
    allowed.tontineScore = body.tontineScore;
  }
  return allowed;
}

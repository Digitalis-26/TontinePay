import { SaspayConfig, SaspayWebhookPayload } from '../types';
import { getAuthHeaders } from '../utils/apiClient';
import { computeHmacSha256 } from '../utils/security';

export const DEFAULT_SASPAY_CONFIG: SaspayConfig = {
  merchantCode: 'SAS-TONTINE-88210',
  clientId: 'sas_live_client_uemoa_99a8b7c',
  clientSecret: 'sas_sec_44f8e912c0a98ef2',
  environment: 'sandbox',
  currency: 'XOF',
  webhookSecret: 'whsec_saspay_tontine_signature_secret_key_2026',
  autoSettleTontineRound: true,
  status: 'ACTIVE',
};

const SASPAY_STORAGE_KEY = 'tontine_saspay_config_v1';

export function getStoredSaspayConfig(): SaspayConfig {
  if (typeof window === 'undefined') return DEFAULT_SASPAY_CONFIG;
  try {
    const raw = localStorage.getItem(SASPAY_STORAGE_KEY);
    if (!raw) return DEFAULT_SASPAY_CONFIG;
    return { ...DEFAULT_SASPAY_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SASPAY_CONFIG;
  }
}

export function saveStoredSaspayConfig(config: Partial<SaspayConfig>): SaspayConfig {
  const current = getStoredSaspayConfig();
  const updated: SaspayConfig = { ...current, ...config };
  if (typeof window !== 'undefined') {
    localStorage.setItem(SASPAY_STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export interface SaspayInitiateParams {
  amount: number;
  currency?: string;
  phoneNumber: string;
  customerName: string;
  tontineId: string;
  tontineName: string;
  memberUserId: string;
  roundNumber: number;
  channel?: 'MOOV_MONEY' | 'ORANGE_MONEY' | 'ALL';
}

export interface SaspayInitiateResponse {
  success: boolean;
  checkoutRequestId: string;
  merchantCode: string;
  amount: number;
  currency: string;
  checkoutUrl: string;
  instructions: string;
  status: 'INITIATED' | 'PENDING_PUSH';
}

/**
 * Initiates a C2B payment through Saspay Gateway
 */
export async function initiateSaspayPayment(
  params: SaspayInitiateParams
): Promise<SaspayInitiateResponse> {
  const config = getStoredSaspayConfig();

  const response = await fetch('/api/payments/saspay/initiate', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...params,
      merchantCode: config.merchantCode,
      currency: config.currency,
      environment: config.environment,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Échec de l\'initialisation du paiement Saspay');
  }

  return response.json();
}

/**
 * Sends a cryptographically signed sandbox webhook to the Saspay webhook endpoint
 */
export async function simulateSaspayWebhook(payload: Partial<SaspayWebhookPayload>) {
  const config = getStoredSaspayConfig();
  const timestampMs = Date.now();

  const fullPayload: SaspayWebhookPayload = {
    MerchantCode: config.merchantCode,
    CheckoutRequestID: payload.CheckoutRequestID || `SAS-CHK-${timestampMs}`,
    ResultCode: 0,
    ResultDesc: 'Transaction completed successfully via Saspay Multi-Operator Aggregator',
    Amount: payload.Amount || 50000,
    Msisdn: payload.Msisdn || '22670000000',
    BillRefNumber: payload.BillRefNumber || `BILL-${timestampMs}`,
    AccountReference: payload.AccountReference || 'TONTINE-COTISATION',
    TransactionDate: new Date(timestampMs).toISOString(),
    tontineId: payload.tontineId,
    memberUserId: payload.memberUserId,
    roundNumber: payload.roundNumber || 1,
  };

  const rawBody = JSON.stringify(fullPayload);
  const hmacHex = await computeHmacSha256(config.webhookSecret, `${timestampMs}.${rawBody}`);

  const response = await fetch('/api/payments/saspay/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-timestamp': String(timestampMs),
      'x-saspay-signature': `sha256=${hmacHex}`,
    },
    body: rawBody,
  });

  return response.json();
}

/**
 * Initiates a B2C disbursement through Saspay (for cagnotte winner payout or manager commission withdrawal)
 */
export async function disburseSaspayPayout(params: {
  amount: number;
  recipientPhone: string;
  recipientName: string;
  reason: string;
  tontineId?: string;
  managerId?: string;
}) {
  const config = getStoredSaspayConfig();
  const response = await fetch('/api/payments/saspay/disburse', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      ...params,
      merchantCode: config.merchantCode,
      currency: config.currency,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Échec du virement sortant Saspay B2C');
  }

  return response.json();
}

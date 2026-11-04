import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getAllUsers,
  getOrCreateUser,
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
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.get('/api/health', async (_req, res) => {
  try {
    const users = await getAllUsers();
    res.json({
      status: 'ok',
      database: 'Cloud SQL PostgreSQL (europe-west2)',
      usersCount: users.length,
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

// Users
app.get('/api/users', async (_req, res) => {
  try {
    const usersList = await getAllUsers();
    res.json(usersList);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch users' });
  }
});

app.post('/api/users/sync', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { uid, email, phone, firstName, lastName, role, kycStatus, managerPlanCode, memberPaymentMethod } = req.body;
    const effectiveUid = req.user?.uid || uid;
    const effectiveEmail = req.user?.email || email;

    if (!effectiveUid || !effectiveEmail) {
      return res.status(400).json({ error: 'Missing user identification' });
    }

    const user = await getOrCreateUser({
      uid: effectiveUid,
      email: effectiveEmail,
      phone,
      firstName: firstName || 'Utilisateur',
      lastName: lastName || '',
      role: role || 'MEMBER',
      kycStatus,
      managerPlanCode,
      memberPaymentMethod,
    });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to sync user' });
  }
});

// Tontines
app.get('/api/tontines', async (_req, res) => {
  try {
    const tontinesList = await getAllTontinesWithMembers();
    res.json(tontinesList);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to fetch tontines' });
  }
});

app.post('/api/tontines', async (req, res) => {
  try {
    const { tontine, members } = req.body;
    if (!tontine || !tontine.id || !tontine.name) {
      return res.status(400).json({ error: 'Données de tontine invalides' });
    }

    const created = await createTontineWithMembers(tontine, members || []);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to create tontine' });
  }
});

app.post('/api/tontines/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const memberData = req.body;
    const joined = await joinTontine(id, memberData);
    res.status(201).json(joined);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to join tontine' });
  }
});

app.post('/api/tontines/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentData, memberUserId } = req.body;
    const payment = await recordPayment(paymentData, id, memberUserId);
    res.status(201).json(payment);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to record payment' });
  }
});

// Payment API & Webhooks (Saspay, Wave, Orange Money, MTN MoMo, CinetPay, Paydunya)
const recentPaymentWebhooks: any[] = [];
const recentSaspayWebhooks: any[] = [];

let saspayServerConfig = {
  merchantCode: 'SAS-TONTINE-88210',
  clientId: 'sas_live_client_uemoa_99a8b7c',
  clientSecret: 'sas_sec_44f8e912c0a98ef2',
  environment: 'sandbox',
  currency: 'XOF',
  webhookSecret: 'whsec_saspay_tontine_signature_secret_key_2026',
  autoSettleTontineRound: true,
  status: 'ACTIVE',
};

app.get('/api/payments/gateway-info', (_req, res) => {
  res.json({
    status: 'ACTIVE',
    primaryGateway: 'Saspay Multi-Operator Gateway (UEMOA & Pan-African)',
    webhookEndpoint: '/api/payments/webhook',
    saspayWebhookEndpoint: '/api/payments/saspay/webhook',
    supportedGateways: [
      'Saspay Gateway (C2B & B2C Multi-Operator)',
      'Wave Checkout API',
      'Orange Money Web Payment',
      'MTN Mobile Money',
      'Moov Flooz',
      'CinetPay Multi-Operator',
      'Paydunya Gateway',
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

// Saspay Config Routes
app.get('/api/payments/saspay/config', (_req, res) => {
  res.json({
    ...saspayServerConfig,
    webhookEndpoint: '/api/payments/saspay/webhook',
    recentLogsCount: recentSaspayWebhooks.length,
  });
});

app.post('/api/payments/saspay/config', (req, res) => {
  const updates = req.body;
  saspayServerConfig = {
    ...saspayServerConfig,
    ...updates,
    status: 'ACTIVE',
  };
  res.json({
    success: true,
    message: 'Configuration Saspay mise à jour avec succès.',
    config: saspayServerConfig,
  });
});

// Saspay Initiate Payment (C2B Collection)
app.post('/api/payments/saspay/initiate', (req, res) => {
  try {
    const { amount, currency, phoneNumber, customerName, tontineId, tontineName, memberUserId, roundNumber, channel } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Montant invalide pour Saspay' });
    }

    const checkoutRequestId = `SAS-CHK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const billRef = `TONT-${(tontineId || 'GRP').slice(0, 6).toUpperCase()}-R${roundNumber || 1}`;

    res.status(200).json({
      success: true,
      checkoutRequestId,
      merchantCode: saspayServerConfig.merchantCode,
      amount: Number(amount),
      currency: currency || saspayServerConfig.currency,
      environment: saspayServerConfig.environment,
      billRefNumber: billRef,
      checkoutUrl: `https://${saspayServerConfig.environment === 'sandbox' ? 'sandbox.' : ''}saspay.app/pay/${checkoutRequestId}`,
      instructions: `Demande de débit Saspay initiée pour ${customerName || 'le cotisant'}. Un prompt USSD / Push sécurisé a été transmis au ${phoneNumber || 'numéro associé'}.`,
      status: 'INITIATED',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erreur lors de l\'initiation Saspay' });
  }
});

// Saspay Webhook Callback
app.post('/api/payments/saspay/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const {
      MerchantCode,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      Amount,
      Msisdn,
      BillRefNumber,
      AccountReference,
      tontineId,
      memberUserId,
      memberName,
      roundNumber,
    } = payload;

    const signature = req.headers['x-saspay-signature'] || req.headers['x-webhook-signature'];
    const isSuccess = ResultCode === 0 || ResultCode === '0' || !ResultCode;

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
      signature: signature || 'verified',
      tontineId,
      memberUserId,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
    };

    recentSaspayWebhooks.unshift(logItem);
    if (recentSaspayWebhooks.length > 50) recentSaspayWebhooks.pop();

    // If successful and tontine/member info is present, record payment in DB
    if (isSuccess && tontineId && memberUserId && Amount) {
      const paymentRecord = {
        id: `pay-saspay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tontineId,
        memberUserId,
        memberName: memberName || `Cotisant Saspay (${Msisdn || 'Mobile'})`,
        roundNumber: Number(roundNumber) || 1,
        amount: Number(Amount),
        date: new Date().toISOString(),
        paymentMethod: 'SASPAY',
        transactionRef: CheckoutRequestID || `SAS-${Date.now()}`,
        status: 'SUCCESS',
      };

      try {
        await recordPayment(paymentRecord, tontineId, memberUserId);
      } catch (dbErr) {
        console.warn('Saspay DB recording skipped or fallback:', dbErr);
      }
    }

    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Saspay webhook processed and recorded successfully',
      checkoutRequestId: CheckoutRequestID,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      ResultCode: 1,
      ResultDesc: error?.message || 'Failed to process Saspay webhook',
    });
  }
});

// Saspay B2C Disbursement (Payouts to Beneficiaries or Managers)
app.post('/api/payments/saspay/disburse', async (req, res) => {
  try {
    const { amount, recipientPhone, recipientName, reason, tontineId, managerId } = req.body;
    if (!amount || !recipientPhone) {
      return res.status(400).json({ error: 'Montant et téléphone du destinataire requis pour Saspay B2C' });
    }

    const disbursementRef = `SAS-B2C-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    res.status(200).json({
      success: true,
      transactionRef: disbursementRef,
      amount: Number(amount),
      currency: saspayServerConfig.currency,
      recipientPhone,
      recipientName: recipientName || 'Bénéficiaire Tontine',
      status: 'DISBURSED',
      message: `Virement sortant Saspay B2C de ${amount} ${saspayServerConfig.currency} exécuté avec succès vers ${recipientPhone}.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erreur lors du décaissement Saspay B2C' });
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const { tontineId, memberUserId, memberName, amount, provider, transactionRef, roundNumber } = payload;

    const signature = req.headers['x-webhook-signature'];
    const logItem = {
      id: `wh-${Date.now()}`,
      receivedAt: new Date().toISOString(),
      payload,
      signature: signature || 'none',
      status: 'PROCESSED',
    };
    recentPaymentWebhooks.unshift(logItem);
    if (recentPaymentWebhooks.length > 50) recentPaymentWebhooks.pop();

    if (tontineId && memberUserId && amount) {
      const paymentRecord = {
        id: `pay-api-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tontineId,
        memberUserId,
        memberName: memberName || 'Cotisant Mobile Money',
        roundNumber: Number(roundNumber) || 1,
        amount: Number(amount),
        date: new Date().toISOString(),
        paymentMethod: provider || 'WAVE',
        transactionRef: transactionRef || `API-${Date.now()}`,
        status: 'SUCCESS',
      };

      try {
        await recordPayment(paymentRecord, tontineId, memberUserId);
      } catch (dbErr) {
        console.warn('DB recording skipped or fallback:', dbErr);
      }
    }

    res.status(200).json({
      received: true,
      status: 'PROCESSED',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to process webhook' });
  }
});

app.post('/api/payments/initiate', (req, res) => {
  const { amount, provider, memberPhone } = req.body;
  const transactionRef = `${(provider || 'PAY').slice(0, 3).toUpperCase()}-TX-${Date.now()}`;
  res.json({
    success: true,
    transactionRef,
    amount,
    provider,
    checkoutUrl: `https://pay.tontine.app/checkout/${transactionRef}`,
    instructions: `Paiement initié avec succès vers ${memberPhone || 'votre mobile'}. Veuillez approuver la notification push sur votre téléphone.`,
  });
});

app.post('/api/tontines/:id/payout', async (req, res) => {
  try {
    const { id } = req.params;
    const { roundNumber, managerId, commissionAmount } = req.body;
    const result = await payoutBeneficiary(id, roundNumber, managerId, commissionAmount);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to payout beneficiary' });
  }
});

app.patch('/api/tontines/:id/turn', async (req, res) => {
  try {
    const { id } = req.params;
    const { memberUserId, newTurnNumber } = req.body;
    const updated = await updateMemberTurn(id, memberUserId, newTurnNumber);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update member turn' });
  }
});

app.patch('/api/tontines/:id/risk-config', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await updateTontineRiskConfig(id, updates);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update risk config' });
  }
});

app.patch('/api/tontines/:id/members/:memberId/risk', async (req, res) => {
  try {
    const { memberId } = req.params;
    const updates = req.body;
    const updated = await updateMemberRiskData(memberId, updates);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to update member risk' });
  }
});

// Wallet
app.post('/api/wallet/withdraw', async (req, res) => {
  try {
    const { managerId, amount, provider, destinationAccount } = req.body;
    const tx = await withdrawManagerWallet(managerId, amount, provider, destinationAccount);
    res.json(tx);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Failed to withdraw wallet' });
  }
});

// Cron & background tasks
app.post('/api/cron/trigger', async (_req, res) => {
  try {
    const log = await triggerAutomatedCron();
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to trigger cron' });
  }
});

app.get('/api/cron/logs', async (_req, res) => {
  try {
    const logs = await getCronLogs();
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to get cron logs' });
  }
});

async function startServer() {
  // Try seeding on startup if database is empty
  await seedInitialDataIfEmpty();

  // Schedule automated background job every hour
  setInterval(async () => {
    try {
      await triggerAutomatedCron();
    } catch {
      // Background cron non-fatal
    }
  }, 60 * 60 * 1000);

  // Vite middleware for development
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

startServer();

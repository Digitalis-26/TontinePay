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
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
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

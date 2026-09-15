-- ==============================================================================
-- SCRIPT D'EXPORTATION & D'INITIALISATION POSTGRESQL LOCAL - TONTINE APP
-- ==============================================================================
-- Mode d'emploi rapide :
--
-- OPTION 1 : Avec l'outil psql en ligne de commande :
--    1. Créez votre base de données locale (si ce n'est pas déjà fait) :
--       createdb -U postgres tontine_db
--    2. Exécutez ce script dans votre base :
--       psql -U postgres -d tontine_db -f export_local_postgresql.sql
--
-- OPTION 2 : Avec Docker (en 1 commande) :
--    docker run --name tontine-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tontine_db -p 5432:5432 -d postgres:16
--    psql -h localhost -p 5432 -U postgres -d tontine_db -f export_local_postgresql.sql
--
-- OPTION 3 : Avec un client graphique (pgAdmin, DBeaver, TablePlus) :
--    Ouvrez ce fichier et exécutez le script dans une console SQL connectée à votre base.
--
-- Configuration locale dans votre fichier .env pour l'application :
--    SQL_HOST=localhost
--    SQL_PORT=5432
--    SQL_USER=postgres
--    SQL_PASSWORD=votre_mot_de_passe
--    SQL_DB_NAME=tontine_db
-- ==============================================================================

-- 1. Table des utilisateurs (users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    phone TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    kyc_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    kyc_document_type TEXT,
    wallet_balance INTEGER NOT NULL DEFAULT 0,
    manager_plan_code TEXT DEFAULT 'STARTER',
    member_payment_method TEXT DEFAULT 'WAVE',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des tontines (tontines)
CREATE TABLE IF NOT EXISTS tontines (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    manager_id TEXT NOT NULL,
    contribution_amount INTEGER NOT NULL,
    total_rounds INTEGER NOT NULL,
    current_round INTEGER NOT NULL DEFAULT 1,
    frequency TEXT NOT NULL DEFAULT 'MONTHLY',
    commission_rate TEXT NOT NULL DEFAULT '0.05',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    caution_required BOOLEAN NOT NULL DEFAULT TRUE,
    caution_amount INTEGER,
    caution_rule TEXT DEFAULT 'ONE_ROUND_ADVANCE',
    late_penalty_per_day INTEGER NOT NULL DEFAULT 500,
    late_grace_days INTEGER NOT NULL DEFAULT 2,
    penalty_recipient TEXT NOT NULL DEFAULT 'POT',
    require_guarantor_early_rounds BOOLEAN NOT NULL DEFAULT TRUE,
    early_rounds_threshold INTEGER NOT NULL DEFAULT 2,
    total_escrow_amount INTEGER NOT NULL DEFAULT 0,
    next_due_date TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table des membres participants (tontine_members)
CREATE TABLE IF NOT EXISTS tontine_members (
    id TEXT PRIMARY KEY,
    tontine_id TEXT NOT NULL REFERENCES tontines(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    turn_number INTEGER NOT NULL,
    has_paid_current_round BOOLEAN NOT NULL DEFAULT FALSE,
    is_current_beneficiary BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method TEXT NOT NULL DEFAULT 'WAVE',
    caution_status TEXT NOT NULL DEFAULT 'ESCROWED',
    caution_amount INTEGER,
    guarantor_name TEXT,
    guarantor_phone TEXT,
    guarantor_relationship TEXT,
    guarantor_verified BOOLEAN NOT NULL DEFAULT FALSE,
    tontine_score INTEGER NOT NULL DEFAULT 95,
    joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des paiements de cotisations (contribution_payments)
CREATE TABLE IF NOT EXISTS contribution_payments (
    id TEXT PRIMARY KEY,
    tontine_id TEXT NOT NULL REFERENCES tontines(id) ON DELETE CASCADE,
    member_user_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_ref TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des transactions du portefeuille gestionnaire (wallet_transactions)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    manager_id TEXT NOT NULL,
    tontine_id TEXT,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    provider TEXT,
    destination_account TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table des journaux d'exécution cron & automatisations (cron_job_logs)
CREATE TABLE IF NOT EXISTS cron_job_logs (
    id SERIAL PRIMARY KEY,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    items_processed INTEGER DEFAULT 0,
    executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- INDEX DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_tontines_manager ON tontines(manager_id);
CREATE INDEX IF NOT EXISTS idx_tontines_code ON tontines(code);
CREATE INDEX IF NOT EXISTS idx_members_tontine ON tontine_members(tontine_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON tontine_members(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_tontine ON contribution_payments(tontine_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON contribution_payments(member_user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_manager ON wallet_transactions(manager_id);

-- ==============================================================================
-- DONNÉES INITIALES (SEED DATA)
-- ==============================================================================

-- Utilisateurs initiaux
INSERT INTO users (uid, email, phone, first_name, last_name, role, kyc_status, kyc_document_type, wallet_balance, manager_plan_code, member_payment_method)
VALUES 
    ('usr-mgr-001', 'awa.diop@teranga.sn', '+221 77 123 45 67', 'Awa', 'Diop', 'MANAGER', 'VERIFIED', 'PASSPORT', 87500, 'STARTER', 'WAVE'),
    ('usr-mgr-002', 'moussa.fofana@abidjan.ci', '+225 07 88 99 00 11', 'Moussa', 'Fofana', 'MANAGER', 'VERIFIED', 'CNI', 215000, 'PREMIUM', 'ORANGE_MONEY'),
    ('usr-mbr-001', 'fatou.ndiaye@gmail.com', '+221 70 890 12 34', 'Fatou', 'Ndiaye', 'MEMBER', 'VERIFIED', 'CNI', 0, 'STARTER', 'WAVE'),
    ('usr-mbr-002', 'ibrahim.toure@gmail.com', '+225 05 67 89 01 23', 'Ibrahim', 'Touré', 'MEMBER', 'VERIFIED', 'PASSPORT', 0, 'STARTER', 'ORANGE_MONEY'),
    ('usr-mbr-003', 'aminata.diallo@gmail.com', '+221 78 345 67 89', 'Aminata', 'Diallo', 'MEMBER', 'PENDING', 'CNI', 0, 'STARTER', 'WAVE'),
    ('usr-mbr-004', 'yao.kouame@gmail.com', '+225 01 23 45 67 89', 'Yao', 'Kouamé', 'MEMBER', 'VERIFIED', 'CNI', 0, 'STARTER', 'MTN_MOMO')
ON CONFLICT (uid) DO NOTHING;

-- Tontine Teranga (Dakar)
INSERT INTO tontines (
    id, code, name, description, manager_id, contribution_amount, total_rounds, current_round, 
    frequency, commission_rate, status, caution_required, caution_amount, caution_rule, 
    late_penalty_per_day, late_grace_days, penalty_recipient, require_guarantor_early_rounds, 
    early_rounds_threshold, total_escrow_amount, next_due_date
)
VALUES (
    'tnt-001', 'TERANGA-2025', 'Tontine Solidarité Teranga - Dakar', 
    'Cercle d''épargne rotatif solidaire Dakar Plateau', 
    'usr-mgr-001', 50000, 10, 4, 'MONTHLY', '0.025', 'ACTIVE', 
    TRUE, 50000, 'ONE_ROUND_ADVANCE', 1000, 2, 'POT', TRUE, 2, 500000, 
    '2025-05-01 00:00:00'
)
ON CONFLICT (id) DO NOTHING;

-- Tontine Adjamé (Abidjan)
INSERT INTO tontines (
    id, code, name, description, manager_id, contribution_amount, total_rounds, current_round, 
    frequency, commission_rate, status, caution_required, caution_amount, caution_rule, 
    late_penalty_per_day, late_grace_days, penalty_recipient, require_guarantor_early_rounds, 
    early_rounds_threshold, total_escrow_amount, next_due_date
)
VALUES (
    'tnt-002', 'ADJAME-COMMERCE', 'Cagnotte d''Investissement Commerçants Adjamé', 
    'Tontine d''investissement pour commerçants du Forum d''Adjamé', 
    'usr-mgr-002', 100000, 12, 3, 'MONTHLY', '0.035', 'ACTIVE', 
    TRUE, 100000, 'ONE_ROUND_ADVANCE', 2000, 2, 'MANAGER', TRUE, 2, 1200000, 
    '2025-05-01 00:00:00'
)
ON CONFLICT (id) DO NOTHING;

-- Membres de la tontine Teranga
INSERT INTO tontine_members (
    id, tontine_id, user_id, name, phone, turn_number, has_paid_current_round, 
    is_current_beneficiary, payment_method, caution_status, caution_amount, 
    guarantor_name, guarantor_phone, guarantor_relationship, guarantor_verified, tontine_score
)
VALUES 
    ('tm-001', 'tnt-001', 'usr-mbr-001', 'Fatou Ndiaye', '+221 70 890 12 34', 4, TRUE, TRUE, 'WAVE', 'ESCROWED', 50000, 'Mme Coumba Ndiaye', '+221 77 654 32 10', 'Soeur', TRUE, 98),
    ('tm-002', 'tnt-001', 'usr-mbr-003', 'Aminata Diallo', '+221 78 345 67 89', 5, FALSE, FALSE, 'WAVE', 'ESCROWED', 50000, 'Oumar Diallo', '+221 76 112 23 34', 'Frère', TRUE, 89),
    ('tm-003', 'tnt-001', 'usr-mbr-002', 'Ibrahim Touré', '+225 05 67 89 01 23', 1, TRUE, FALSE, 'ORANGE_MONEY', 'ESCROWED', 50000, 'Awa Diop (Gestionnaire)', '+221 77 123 45 67', 'Parrainée', TRUE, 95),
    ('tm-004', 'tnt-001', 'usr-mbr-004', 'Yao Kouamé', '+225 01 23 45 67 89', 2, TRUE, FALSE, 'MTN_MOMO', 'ESCROWED', 50000, 'Awa Diop (Gestionnaire)', '+221 77 123 45 67', 'Parrainé', TRUE, 92)
ON CONFLICT (id) DO NOTHING;

-- Membres de la tontine Adjamé
INSERT INTO tontine_members (
    id, tontine_id, user_id, name, phone, turn_number, has_paid_current_round, 
    is_current_beneficiary, payment_method, caution_status, caution_amount, 
    guarantor_name, guarantor_phone, guarantor_relationship, guarantor_verified, tontine_score
)
VALUES 
    ('tm-021', 'tnt-002', 'usr-mbr-002', 'Ibrahim Touré', '+225 05 67 89 01 23', 3, TRUE, TRUE, 'ORANGE_MONEY', 'ESCROWED', 100000, 'Bakary Touré', '+225 07 00 11 22 33', 'Oncle', TRUE, 96),
    ('tm-022', 'tnt-002', 'usr-mbr-004', 'Yao Kouamé', '+225 01 23 45 67 89', 8, FALSE, FALSE, 'MTN_MOMO', 'ESCROWED', 100000, NULL, NULL, NULL, FALSE, 82),
    ('tm-023', 'tnt-002', 'usr-mbr-001', 'Fatou Ndiaye', '+221 70 890 12 34', 11, TRUE, FALSE, 'WAVE', 'ESCROWED', 100000, NULL, NULL, NULL, FALSE, 94)
ON CONFLICT (id) DO NOTHING;

-- Paiements de cotisations historiques
INSERT INTO contribution_payments (id, tontine_id, member_user_id, member_name, round_number, amount, date, payment_method, transaction_ref, status)
VALUES
    ('pay-001', 'tnt-001', 'usr-mbr-001', 'Fatou Ndiaye', 4, 50000, '2025-04-02T10:14:00Z', 'WAVE', 'WV-TX-998241', 'SUCCESS'),
    ('pay-002', 'tnt-001', 'usr-mbr-001', 'Fatou Ndiaye', 3, 50000, '2025-03-03T11:20:00Z', 'WAVE', 'WV-TX-881204', 'SUCCESS'),
    ('pay-003', 'tnt-001', 'usr-mbr-001', 'Fatou Ndiaye', 2, 50000, '2025-02-04T09:05:00Z', 'WAVE', 'WV-TX-764920', 'SUCCESS'),
    ('pay-004', 'tnt-001', 'usr-mbr-001', 'Fatou Ndiaye', 1, 50000, '2025-01-05T14:40:00Z', 'WAVE', 'WV-TX-651034', 'SUCCESS'),
    ('pay-005', 'tnt-002', 'usr-mbr-002', 'Ibrahim Touré', 3, 100000, '2025-04-01T08:30:00Z', 'ORANGE_MONEY', 'OM-CI-449102', 'SUCCESS')
ON CONFLICT (id) DO NOTHING;

-- Transactions de portefeuille (commissions & retraits)
INSERT INTO wallet_transactions (id, manager_id, tontine_id, type, amount, date, description, provider, destination_account)
VALUES
    ('wtx-001', 'usr-mgr-001', 'tnt-001', 'COMMISSION', 12500, '2025-04-02T10:15:00Z', 'Commission perçue - Tour 4 (Tontine Solidarité Teranga)', 'WAVE', '+221 77 123 45 67'),
    ('wtx-002', 'usr-mgr-001', NULL, 'WITHDRAWAL', 50000, '2025-03-20T14:10:00Z', 'Retrait vers Wave (+221 77 452 89 12)', 'WAVE', '+221 77 452 89 12'),
    ('wtx-003', 'usr-mgr-002', 'tnt-002', 'COMMISSION', 42000, '2025-04-01T08:35:00Z', 'Commission perçue - Tour 3 (Commerçants d''Adjamé)', 'ORANGE_MONEY', '+225 07 88 99 00 11')
ON CONFLICT (id) DO NOTHING;

-- Journal cron initial
INSERT INTO cron_job_logs (job_type, status, details, items_processed)
VALUES 
    ('INITIAL_SEED', 'COMPLETED', 'Initialisation locale réussie avec 2 tontines, 7 membres et historique de paiements', 7);

-- ==============================================================================
-- FIN DU SCRIPT D'EXPORTATION POSTGRESQL
-- ==============================================================================

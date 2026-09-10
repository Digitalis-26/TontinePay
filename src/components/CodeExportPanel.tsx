import { useState } from 'react';
import { PlanConfig } from '../types';
import { generateSQLScript, generatePrismaSeed } from '../data/plans';
import { Copy, Check, Terminal, FileCode, Database } from 'lucide-react';

interface CodeExportPanelProps {
  plans: PlanConfig[];
  rates: Record<PlanConfig['code'], number>;
}

export function CodeExportPanel({ plans, rates }: CodeExportPanelProps) {
  const [activeTab, setActiveTab] = useState<'sql' | 'seed' | 'schema'>('sql');
  const [copied, setCopied] = useState<string | null>(null);

  const effectivePlans = plans.map((p) => ({
    ...p,
    maxCommissionRate: rates[p.code],
  }));

  const sqlCode = generateSQLScript(effectivePlans);
  const prismaSeedCode = generatePrismaSeed(effectivePlans);

  const schemaSnippet = `// Modèle SubscriptionPlan dans prisma/schema.prisma
model SubscriptionPlan {
  id                  Int      @id @default(autoincrement())
  code                String   @unique @db.VarChar(30)
  name                String   @db.VarChar(100)

  monthlyPrice        BigInt   @default(0) @map("monthly_price")

  maxTontines         Int?     @map("max_tontines")
  maxMembers          Int?     @map("max_members")

  commissionEnabled   Boolean  @default(false) @map("commission_enabled")

  // NOUVEAUX TAUX DE COMMISSIONS MAX :
  // - FREE     : 0.0150 (1,5%)
  // - STARTER  : 0.0250 (2,5%)
  // - PREMIUM  : 0.0300 (3,0%)
  // - BUSINESS : 0.0350 (3,5%)
  maxCommissionRate   Decimal  @default(0) @map("max_commission_rate") @db.Decimal(5, 4)

  active              Boolean  @default(true)
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  subscriptions       Subscription[]
  commissionRules     CommissionRule[]

  @@index([active])
  @@map("subscription_plans")
}`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-stone-900 font-bold text-lg">
            <Database className="w-5 h-5 text-amber-600" />
            Scripts d'Application & Intégration en Base de Données
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Scripts prêts à l'emploi pour synchroniser votre base PostgreSQL et vos migrations Prisma
            avec les taux : Free (1,5%), Starter (2,5%), Premium (3%), Business (3,5%).
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'sql'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Migration SQL
          </button>
          <button
            onClick={() => setActiveTab('seed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'seed'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Prisma Seed.ts
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'schema'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Extrait Schema.prisma
          </button>
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="relative rounded-xl bg-stone-950 text-stone-100 border border-stone-800 overflow-hidden font-mono text-xs shadow-inner">
        <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900/90 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-[11px] text-stone-400 font-sans ml-2">
              {activeTab === 'sql' && 'migration_update_commissions.sql'}
              {activeTab === 'seed' && 'prisma/seed.ts'}
              {activeTab === 'schema' && 'prisma/schema.prisma'}
            </span>
          </div>

          <button
            onClick={() =>
              handleCopy(
                activeTab === 'sql'
                  ? sqlCode
                  : activeTab === 'seed'
                  ? prismaSeedCode
                  : schemaSnippet,
                activeTab
              )
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-sans transition-colors"
          >
            {copied === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le script</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 overflow-x-auto leading-relaxed text-stone-200 max-h-96">
          <code>
            {activeTab === 'sql' && sqlCode}
            {activeTab === 'seed' && prismaSeedCode}
            {activeTab === 'schema' && schemaSnippet}
          </code>
        </pre>
      </div>

      {/* Usage instructions */}
      <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-xs text-stone-700 space-y-2">
        <h5 className="font-bold text-stone-900 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-stone-700" />
          Instructions d'exécution dans votre terminal :
        </h5>
        {activeTab === 'sql' && (
          <p>
            Exécutez ce script SQL directement avec votre client PostgreSQL (psql, DBeaver, Supabase, Cloud SQL ou pgAdmin) :<br />
            <code className="mt-1.5 inline-block bg-stone-900 text-stone-100 px-3 py-1.5 rounded-lg font-mono">
              psql $DATABASE_URL -f migration_update_commissions.sql
            </code>
          </p>
        )}
        {activeTab === 'seed' && (
          <p>
            Lancez le seeder Prisma pour appliquer les configurations en base :<br />
            <code className="mt-1.5 inline-block bg-stone-900 text-stone-100 px-3 py-1.5 rounded-lg font-mono">
              npx prisma db seed
            </code>
          </p>
        )}
        {activeTab === 'schema' && (
          <p>
            Pour regénérer le client Prisma après modification du schéma :<br />
            <code className="mt-1.5 inline-block bg-stone-900 text-stone-100 px-3 py-1.5 rounded-lg font-mono">
              npx prisma generate
            </code>
          </p>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  RegisteredUser,
  TontineRecord,
  MemberContributionPayment,
  ManagerWalletTransaction,
  PlanConfig,
} from '../types';
import { ManagerDashboard } from './ManagerDashboard';
import { MemberDashboard } from './MemberDashboard';
import {
  Briefcase,
  User,
  CheckCircle2,
  Users,
  ChevronDown,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  users: RegisteredUser[];
  connectedUser: RegisteredUser | null;
  onSelectConnectedUser: (user: RegisteredUser) => void;
  tontines: TontineRecord[];
  payments: MemberContributionPayment[];
  walletTransactions: ManagerWalletTransaction[];
  currentRates: Record<PlanConfig['code'], number>;
  onWithdraw: (amount: number, provider: string, account: string) => void;
  onCreateTontine: (tontine: Omit<TontineRecord, 'id'>) => void;
  onPayoutBeneficiary: (tontineId: string, roundNumber: number) => void;
  onPayContribution: (tontineId: string, amount: number, paymentMethod: string) => void;
  onJoinTontineWithCode: (code: string) => boolean;
  onNavigateToSimulate: (planCode: PlanConfig['code']) => void;
  onNavigateToRegister: () => void;
  onNavigateToLogin?: () => void;
}

export function DashboardView({
  users,
  connectedUser,
  onSelectConnectedUser,
  tontines,
  payments,
  walletTransactions,
  currentRates,
  onWithdraw,
  onCreateTontine,
  onPayoutBeneficiary,
  onPayContribution,
  onJoinTontineWithCode,
  onNavigateToSimulate,
  onNavigateToRegister,
  onNavigateToLogin,
}: DashboardViewProps) {
  const managers = users.filter((u) => u.role === 'MANAGER');
  const members = users.filter((u) => u.role === 'MEMBER');

  if (!connectedUser) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 mx-auto">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-stone-900">
            Session déconnectée
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
            Veuillez vous connecter avec vos identifiants ou sélectionner un compte de test
            pour accéder à votre tableau de bord de tontine personnalisé.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onNavigateToLogin && (
            <button
              onClick={onNavigateToLogin}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-xs"
            >
              Aller à la page de Connexion
            </button>
          )}
          {managers[0] && (
            <button
              onClick={() => onSelectConnectedUser(managers[0])}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-800 transition-colors"
            >
              Connexion rapide (Awa Diop)
            </button>
          )}
        </div>
      </div>
    );
  }

  const isManager = connectedUser.role === 'MANAGER';

  const handleRoleToggle = (targetRole: 'MANAGER' | 'MEMBER') => {
    if (connectedUser.role === targetRole) return;
    if (targetRole === 'MANAGER' && managers.length > 0) {
      onSelectConnectedUser(managers[0]);
    } else if (targetRole === 'MEMBER' && members.length > 0) {
      onSelectConnectedUser(members[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Universal Connected User Switcher Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Role Switcher buttons */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-stone-500 shrink-0">
            Session active :
          </span>
          <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs">
            <button
              onClick={() => handleRoleToggle('MANAGER')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all ${
                isManager
                  ? 'bg-stone-900 text-amber-400 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Espace Gestionnaire
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-amber-300 font-mono">
                {managers.length}
              </span>
            </button>
            <button
              onClick={() => handleRoleToggle('MEMBER')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all ${
                !isManager
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Espace Membre Cotisant
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-800 text-white font-mono">
                {members.length}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Quick User Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-stone-500 whitespace-nowrap">
            Changer d'utilisateur :
          </label>
          <div className="relative flex-1 sm:w-72">
            <select
              value={connectedUser.id}
              onChange={(e) => {
                const target = users.find((u) => u.id === e.target.value);
                if (target) onSelectConnectedUser(target);
              }}
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 truncate"
            >
              {isManager ? (
                <optgroup label="Gestionnaires (Managers)">
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} • {m.managerDetails?.businessName || 'Gérant'} (
                      {m.managerDetails?.planCode})
                    </option>
                  ))}
                </optgroup>
              ) : (
                <optgroup label="Membres Cotisants">
                  {members.map((mbr) => (
                    <option key={mbr.id} value={mbr.id}>
                      {mbr.firstName} {mbr.lastName} • {mbr.city} ({mbr.memberDetails?.paymentMethod})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <button
            onClick={onNavigateToRegister}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 hover:underline shrink-0 hidden lg:inline-block"
          >
            + Inscrire un autre
          </button>
        </div>
      </div>

      {/* Conditional Rendering based on active role */}
      {isManager ? (
        <ManagerDashboard
          manager={connectedUser}
          tontines={tontines}
          walletTransactions={walletTransactions}
          currentRates={currentRates}
          onWithdraw={onWithdraw}
          onCreateTontine={onCreateTontine}
          onPayoutBeneficiary={onPayoutBeneficiary}
          onNavigateToSimulate={onNavigateToSimulate}
        />
      ) : (
        <MemberDashboard
          member={connectedUser}
          tontines={tontines}
          payments={payments}
          onPayContribution={onPayContribution}
          onJoinTontineWithCode={onJoinTontineWithCode}
        />
      )}
    </div>
  );
}

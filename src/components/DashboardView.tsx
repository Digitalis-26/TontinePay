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
import { InstallAppModal } from './InstallAppModal';
import {
  Briefcase,
  User,
  CheckCircle2,
  Users,
  ChevronDown,
  ArrowRightLeft,
  Sparkles,
  ShieldCheck,
  Lock,
  LogOut,
  EyeOff,
  UserCheck,
  ShieldAlert,
  Smartphone,
  Download,
} from 'lucide-react';

interface DashboardViewProps {
  users: RegisteredUser[];
  connectedUser: RegisteredUser | null;
  onSelectConnectedUser: (user: RegisteredUser) => void;
  tontines: TontineRecord[];
  allTontinesCount?: number;
  payments: MemberContributionPayment[];
  walletTransactions: ManagerWalletTransaction[];
  currentRates: Record<PlanConfig['code'], number>;
  onWithdraw: (amount: number, provider: string, account: string) => void;
  onCreateTontine: (tontine: Omit<TontineRecord, 'id'>) => void;
  onPayoutBeneficiary: (tontineId: string, roundNumber: number) => void;
  onUpdateTontineAmount?: (tontineId: string, newAmount: number) => void;
  onPayContribution: (tontineId: string, amount: number, paymentMethod: string) => void;
  onJoinTontineWithCode: (code: string, preferredTurn?: number) => boolean;
  onUpdateMemberTurn?: (tontineId: string, memberUserId: string, newTurnNumber: number) => void;
  onNavigateToSimulate: (planCode: PlanConfig['code']) => void;
  onNavigateToRegister: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToRisk?: () => void;
}

export function DashboardView({
  users,
  connectedUser,
  onSelectConnectedUser,
  tontines,
  allTontinesCount,
  payments,
  walletTransactions,
  currentRates,
  onWithdraw,
  onCreateTontine,
  onPayoutBeneficiary,
  onUpdateTontineAmount,
  onPayContribution,
  onJoinTontineWithCode,
  onUpdateMemberTurn,
  onNavigateToSimulate,
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToProfile,
  onNavigateToRisk,
}: DashboardViewProps) {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installPlatform, setInstallPlatform] = useState<'android' | 'ios'>('android');
  const managers = users.filter((u) => u.role === 'MANAGER');
  const members = users.filter((u) => u.role === 'MEMBER');

  if (!connectedUser) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-stone-900">
            Accès Sécurisé & Données Protégées
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
            Seul le gestionnaire ou membre connecté a accès exclusivement à ses propres tontines
            (créées ou rejointes). Veuillez vous connecter pour accéder à votre espace sécurisé.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onNavigateToLogin && (
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-sm cursor-pointer"
            >
              Se connecter
            </button>
          )}
          {onNavigateToRegister && (
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white border border-stone-800 transition-colors cursor-pointer"
            >
              Créer un compte
            </button>
          )}
        </div>
      </div>
    );
  }

  const isManager = connectedUser.role === 'MANAGER';

  // Isolation stricte : Un utilisateur n'a accès qu'aux tontines créées OU rejointes par son compte
  const accessibleTontines = tontines.filter(
    (t) => t.managerId === connectedUser.id || t.members.some((m) => m.userId === connectedUser.id)
  );

  return (
    <div className="space-y-6">
      {/* Conditional Rendering based on active role */}
      {isManager ? (
        <ManagerDashboard
          manager={connectedUser}
          tontines={accessibleTontines}
          walletTransactions={walletTransactions}
          currentRates={currentRates}
          onWithdraw={onWithdraw}
          onCreateTontine={onCreateTontine}
          onPayoutBeneficiary={onPayoutBeneficiary}
          onUpdateTontineAmount={onUpdateTontineAmount}
          onUpdateMemberTurn={onUpdateMemberTurn}
          onNavigateToSimulate={onNavigateToSimulate}
          onNavigateToRisk={onNavigateToRisk}
        />
      ) : (
        <MemberDashboard
          member={connectedUser}
          tontines={accessibleTontines}
          payments={payments}
          onPayContribution={onPayContribution}
          onJoinTontineWithCode={onJoinTontineWithCode}
          onUpdateMemberTurn={onUpdateMemberTurn}
          onNavigateToRisk={onNavigateToRisk}
        />
      )}

      {/* Install Mobile App Modal (Android & iOS) */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        defaultPlatform={installPlatform}
      />
    </div>
  );
}


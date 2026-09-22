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
import { LoginView } from './LoginView';
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
      <LoginView
        users={users}
        connectedUser={null}
        onLogin={onSelectConnectedUser}
        onLogout={() => {}}
        onNavigateToRegister={onNavigateToRegister}
        onNavigateToDashboard={() => {}}
      />
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


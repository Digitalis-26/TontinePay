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

  const createdCount = accessibleTontines.filter((t) => t.managerId === connectedUser.id).length;
  const joinedCount = accessibleTontines.filter(
    (t) => t.managerId !== connectedUser.id && t.members.some((m) => m.userId === connectedUser.id)
  ).length;

  const totalSystemTontines = allTontinesCount ?? tontines.length;
  const hiddenTontinesCount = Math.max(0, totalSystemTontines - accessibleTontines.length);

  return (
    <div className="space-y-6">
      {/* Session Header with Strict Security & Isolation Notice */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Security badge top bar */}
        <div className="px-5 py-2 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-stone-100">Confidentialité & Accès Cloisonné</span>
            <span className="hidden sm:inline text-stone-400">•</span>
            <span className="text-stone-300 text-[11px] hidden sm:inline">
              Accès strictement limité aux tontines créées ou rejointes par ce compte
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {accessibleTontines.length} tontine(s) visible(s)
            </span>
            {hiddenTontinesCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700 flex items-center gap-1">
                <EyeOff className="w-3 h-3 text-stone-500" />
                {hiddenTontinesCount} autre(s) tontine(s) masquée(s)
              </span>
            )}
          </div>
        </div>

        {/* User Identity & Switcher bar */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* User profile details */}
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                isManager
                  ? 'bg-amber-500 text-stone-950 border border-amber-600'
                  : 'bg-emerald-600 text-white border border-emerald-700'
              }`}
            >
              {connectedUser.firstName.charAt(0)}
              {connectedUser.lastName.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-stone-900">
                  {connectedUser.firstName} {connectedUser.lastName}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isManager
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {isManager ? 'Gestionnaire' : 'Membre Cotisant'}
                </span>
                {isManager && connectedUser.managerDetails?.planCode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-100 text-stone-700">
                    Plan {connectedUser.managerDetails.planCode}
                  </span>
                )}
                {/* Live KYC status badge */}
                {onNavigateToProfile && (
                  <button
                    type="button"
                    onClick={onNavigateToProfile}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      connectedUser.kyc?.status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                        : connectedUser.kyc?.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                        : 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300'
                    }`}
                    title="Gérer mon profil et ma vérification KYC"
                  >
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span>
                      {connectedUser.kyc?.status === 'VERIFIED'
                        ? `KYC Vérifié (Niv. ${connectedUser.kyc.level})`
                        : connectedUser.kyc?.status === 'PENDING'
                        ? 'KYC en cours'
                        : 'KYC requis'}
                    </span>
                  </button>
                )}
              </div>

              <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2 mt-0.5">
                <span>{connectedUser.countryName} ({connectedUser.city})</span>
                <span>•</span>
                <span className="font-mono">{connectedUser.phone}</span>
                <span>•</span>
                <span className="text-stone-700 font-medium">
                  {createdCount > 0 && `${createdCount} créée(s)`}
                  {createdCount > 0 && joinedCount > 0 && ' • '}
                  {joinedCount > 0 && `${joinedCount} rejointe(s)`}
                  {createdCount === 0 && joinedCount === 0 && '0 tontine active'}
                </span>
              </div>
            </div>
          </div>

          {/* Session Switcher, Profile CTA or Logout */}
          <div className="flex flex-wrap items-center gap-3">
            {onNavigateToProfile && (
              <button
                type="button"
                onClick={onNavigateToProfile}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mon Profil & KYC</span>
              </button>
            )}

            {users.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-stone-500 whitespace-nowrap hidden sm:inline">
                  Changer de compte :
                </label>
                <div className="relative w-full sm:w-56">
                  <select
                    value={connectedUser.id}
                    onChange={(e) => {
                      const target = users.find((u) => u.id === e.target.value);
                      if (target) onSelectConnectedUser(target);
                    }}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 truncate cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role === 'MANAGER' ? 'Manager' : 'Membre'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {onNavigateToLogin && (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="px-3 py-2 rounded-xl border border-stone-300 hover:border-red-300 hover:bg-red-50 text-stone-600 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Se déconnecter de ce compte"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            )}
          </div>
        </div>

        {/* KYC Incomplete Warning Banner */}
        {connectedUser.kyc?.status !== 'VERIFIED' && onNavigateToProfile && (
          <div className="px-5 py-3 bg-amber-50 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Vérification KYC recommandée :</strong> Validez votre pièce d'identité officielle (CNI / CEDEAO ou Passeport) pour déplafonner vos retraits et cotisations.
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateToProfile}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs whitespace-nowrap transition-colors self-start sm:self-auto cursor-pointer"
            >
              Compléter mon KYC
            </button>
          </div>
        )}
      </div>

      {/* Mobile App Install CTA Banner (Prominent on Web / Desktop) */}
      <div
        id="dashboard-mobile-install-banner"
        className="rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-4 sm:p-5 text-white shadow-sm border border-emerald-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/10">
            <Smartphone className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                Application TONTINE sur Smartphone
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-700/60 text-[10px] font-semibold text-emerald-200 border border-emerald-500/30">
                PWA / Mobile
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 mt-0.5">
              Installez l'application sur votre smartphone Android ou iPhone pour recevoir les rappels de cotisation et consulter vos tours hors-ligne.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            id="banner-install-android-btn"
            onClick={() => {
              setInstallPlatform('android');
              setShowInstallModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.996-3.4572c.1557-.2696.0633-.6135-.2063-.7692-.2691-.1557-.613-.0633-.7687.2063l-2.0231 3.5042c-1.4646-.6675-3.097-1.0423-4.8794-1.0423s-3.4148.3748-4.8794 1.0423l-2.0231-3.5042c-.1557-.2696-.4996-.362-7687-.2063-.2696.1557-.362.4996-.2063.7692l1.996 3.4572c-3.1979 1.7454-5.3853 4.966-5.7196 8.7845h22.7935c-.3343-3.8185-2.5217-7.0391-5.7196-8.7845" />
            </svg>
            <span>Installer Android</span>
          </button>

          <button
            type="button"
            id="banner-install-ios-btn"
            onClick={() => {
              setInstallPlatform('ios');
              setShowInstallModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold border border-white/20 transition-all shadow-xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.61 1.34-.55.63-1.03 1.68-.9 2.71.99.08 2-.45 2.59-1.2" />
            </svg>
            <span>Installer iPhone (iOS)</span>
          </button>
        </div>
      </div>

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


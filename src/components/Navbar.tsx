import {
  Coins,
  Layers,
  UserPlus,
  LayoutDashboard,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { RegisteredUser } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'plans' | 'simulator' | 'ledger' | 'registration' | 'export' | 'schema' | 'login';
  setActiveTab: (tab: any) => void;
  registeredCount?: number;
  connectedUser?: RegisteredUser | null;
  onLogout?: () => void;
}

export function Navbar({ activeTab, setActiveTab, registeredCount, connectedUser, onLogout }: NavbarProps) {
  const isManager = connectedUser?.role === 'MANAGER';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-slate-800 text-slate-100 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner hover:bg-emerald-500/20 transition-all text-left"
            >
              <Coins className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">TontinePay</span>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Épargne & Commissions
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Starter 2 500 F • Premium 5 000 F • Business 10 000 F
              </p>
            </div>
          </div>

          {/* Navigation tabs - ONLY Essential Options */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800/80">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Tableau de Bord
              {connectedUser && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    activeTab === 'dashboard'
                      ? 'bg-slate-900 text-emerald-300'
                      : isManager
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {isManager ? 'Manager' : 'Membre'}
                </span>
              )}
            </button>

            <button
              id="tab-plans"
              onClick={() => setActiveTab('plans')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'plans' || activeTab === 'simulator'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Forfaits & Simulateur
            </button>

            <button
              id="tab-registration"
              onClick={() => setActiveTab('registration')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'registration'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Inscription
              {typeof registeredCount === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'registration'
                      ? 'bg-slate-900 text-emerald-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {registeredCount}
                </span>
              )}
            </button>

            <button
              id="tab-login"
              onClick={() => setActiveTab('login')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'login'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Connexion
            </button>
          </nav>

          {/* Connected User Badge or Login CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {connectedUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-slate-800 border-emerald-500/60 text-white'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                  title="Accéder à mon espace"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isManager
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {connectedUser.firstName.charAt(0)}
                    {connectedUser.lastName.charAt(0)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold leading-tight">
                      {connectedUser.firstName} {connectedUser.lastName}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      {isManager ? (
                        <span className="text-amber-400 font-semibold">Manager ({connectedUser.managerDetails?.planCode})</span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">Membre ({connectedUser.memberDetails?.paymentMethod})</span>
                      )}
                    </div>
                  </div>
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 rounded-xl bg-slate-950/80 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 transition-colors"
                    title="Se déconnecter"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('login')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Bar - Only 4 Essential Options */}
        <div className="md:hidden flex items-center justify-between py-2.5 border-t border-slate-800 gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 text-center whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 text-center whitespace-nowrap ${
              activeTab === 'plans' || activeTab === 'simulator' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Forfaits
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 text-center whitespace-nowrap ${
              activeTab === 'registration' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Inscription
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 text-center whitespace-nowrap ${
              activeTab === 'login' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Connexion
          </button>
        </div>
      </div>
    </header>
  );
}

import {
  Coins,
  Database,
  Layers,
  Calculator,
  BookOpen,
  CheckCircle2,
  UserPlus,
  LayoutDashboard,
  Briefcase,
  User,
  LogIn,
  LogOut,
} from 'lucide-react';
import { RegisteredUser } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'plans' | 'simulator' | 'ledger' | 'registration' | 'export' | 'schema' | 'login';
  setActiveTab: (tab: 'dashboard' | 'plans' | 'simulator' | 'ledger' | 'registration' | 'export' | 'schema' | 'login') => void;
  registeredCount?: number;
  connectedUser?: RegisteredUser | null;
  onLogout?: () => void;
}

export function Navbar({ activeTab, setActiveTab, registeredCount, connectedUser, onLogout }: NavbarProps) {
  const isManager = connectedUser?.role === 'MANAGER';

  return (
    <header className="sticky top-0 z-30 bg-stone-900 border-b border-stone-800 text-stone-100 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner hover:bg-amber-500/20 transition-colors text-left"
            >
              <Coins className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-white text-base">TontinePay</span>
                <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Commissions Actives
                </span>
              </div>
              <p className="text-xs text-stone-400 hidden sm:block">
                Free 1,5% • Starter 2,5% • Premium 3% • Business 3,5%
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-stone-950/60 p-1 rounded-xl border border-stone-800">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Tableau de Bord
              {connectedUser && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold uppercase ${
                    activeTab === 'dashboard'
                      ? 'bg-stone-900 text-amber-300'
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'plans'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Plans & Taux
            </button>
            <button
              id="tab-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Simulateur Tontine
            </button>
            <button
              id="tab-registration"
              onClick={() => setActiveTab('registration')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'registration'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Inscription
              {typeof registeredCount === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'registration'
                      ? 'bg-stone-900 text-amber-300'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {registeredCount}
                </span>
              )}
            </button>
            <button
              id="tab-ledger"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'ledger'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Grand Livre
            </button>
            <button
              id="tab-export"
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'export'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              SQL & Prisma
            </button>
            <button
              id="tab-schema"
              onClick={() => setActiveTab('schema')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'schema'
                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Schéma
            </button>
            <button
              id="tab-login"
              onClick={() => setActiveTab('login')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'login'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Connexion
            </button>
          </nav>

          {/* Connected User or Login Button on Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {connectedUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-stone-800 border-amber-500/60 text-white'
                      : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 text-stone-200'
                  }`}
                  title="Accéder au Tableau de Bord"
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
                    <div className="text-[10px] text-stone-400 flex items-center gap-1">
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
                    className="p-2 rounded-xl bg-stone-950/80 hover:bg-red-500/10 text-stone-400 hover:text-red-400 border border-stone-800 hover:border-red-500/30 transition-colors"
                    title="Se déconnecter"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('login')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden flex items-center justify-between py-2 border-t border-stone-800 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap font-bold flex items-center gap-1 ${
              activeTab === 'dashboard' ? 'bg-amber-500 text-stone-950' : 'text-stone-300'
            }`}
          >
            <LayoutDashboard className="w-3 h-3" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap font-bold flex items-center gap-1 ${
              activeTab === 'login' ? 'bg-amber-500 text-stone-950' : 'text-stone-300'
            }`}
          >
            <LogIn className="w-3 h-3" />
            Connexion
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
              activeTab === 'plans' ? 'bg-amber-500 text-stone-950 font-medium' : 'text-stone-300'
            }`}
          >
            Plans & Taux
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
              activeTab === 'simulator' ? 'bg-amber-500 text-stone-950 font-medium' : 'text-stone-300'
            }`}
          >
            Simulateur
          </button>
          <button
            onClick={() => setActiveTab('registration')}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
              activeTab === 'registration' ? 'bg-amber-500 text-stone-950 font-medium' : 'text-stone-300'
            }`}
          >
            Inscription
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
              activeTab === 'ledger' ? 'bg-amber-500 text-stone-950 font-medium' : 'text-stone-300'
            }`}
          >
            Grand Livre
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
              activeTab === 'export' ? 'bg-amber-500 text-stone-950 font-medium' : 'text-stone-300'
            }`}
          >
            SQL / Prisma
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap ${
              activeTab === 'schema' ? 'bg-amber-500 text-stone-950 font-medium' : 'text-stone-300'
            }`}
          >
            Schéma
          </button>
        </div>
      </div>
    </header>
  );
}


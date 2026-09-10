import React, { useState } from 'react';
import {
  Lock,
  User,
  Briefcase,
  Smartphone,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  LogOut,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { RegisteredUser, PlanConfig } from '../types';
import { SUPPORTED_COUNTRIES } from '../data/users';
import { formatXOF, formatPercent } from '../data/plans';

interface LoginViewProps {
  users: RegisteredUser[];
  connectedUser: RegisteredUser | null;
  onLogin: (user: RegisteredUser) => void;
  onLogout: () => void;
  onNavigateToRegister: () => void;
  onNavigateToDashboard: () => void;
}

export function LoginView({
  users,
  connectedUser,
  onLogin,
  onLogout,
  onNavigateToRegister,
  onNavigateToDashboard,
}: LoginViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'quick'>('form');
  const [loginMethod, setLoginMethod] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+221');
  const [phoneNumber, setPhoneNumber] = useState('77 452 89 12'); // Defaults to Awa Diop
  const [emailInput, setEmailInput] = useState('awa.diop@teranga-tontine.sn');
  const [pinOrPassword, setPinOrPassword] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('8492');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [pendingUser, setPendingUser] = useState<RegisteredUser | null>(null);

  // Filter for demo users
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'MANAGERS' | 'MEMBERS'>('ALL');

  const managers = users.filter((u) => u.role === 'MANAGER');
  const members = users.filter((u) => u.role === 'MEMBER');

  const filteredUsers = users.filter((u) => {
    if (quickFilter === 'MANAGERS') return u.role === 'MANAGER';
    if (quickFilter === 'MEMBERS') return u.role === 'MEMBER';
    return true;
  });

  // Handle standard form submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      let matchedUser: RegisteredUser | undefined;

      if (loginMethod === 'PHONE') {
        const cleanedEnteredPhone = (phoneCountryCode + phoneNumber).replace(/[\s\-\.]/g, '');
        matchedUser = users.find((u) => {
          const cleanUPhone = u.phone.replace(/[\s\-\.]/g, '');
          return cleanUPhone.includes(cleanedEnteredPhone.slice(-8));
        });
      } else {
        const cleanEmail = emailInput.trim().toLowerCase();
        matchedUser = users.find(
          (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
        );
      }

      setIsSubmitting(false);

      if (!matchedUser) {
        setErrorMessage(
          loginMethod === 'PHONE'
            ? `Aucun compte enregistré avec le numéro ${phoneCountryCode} ${phoneNumber}. Cliquez sur l'onglet "Accès 1-Clic" pour sélectionner un profil de test ou inscrivez-vous.`
            : `Aucun compte enregistré avec l'adresse "${emailInput}". Veuillez vérifier la saisie ou créer un compte.`
        );
        return;
      }

      // Check PIN/password: accept '1234', user.pinCode, user.password, or any 4+ char input
      if (pinOrPassword.length < 4) {
        setErrorMessage('Le code secret ou mot de passe doit comporter au moins 4 caractères.');
        return;
      }

      // Successful login
      onLogin(matchedUser);
    }, 450);
  };

  const handleQuickLogin = (user: RegisteredUser) => {
    onLogin(user);
  };

  const handleSelectSuggestedAccount = (user: RegisteredUser) => {
    if (user.email) {
      setEmailInput(user.email);
    }
    // Extract phone
    const cleaned = user.phone.replace(/^\+/, '');
    const foundCountry = SUPPORTED_COUNTRIES.find((c) =>
      user.phone.startsWith(c.dialCode)
    );
    if (foundCountry) {
      setPhoneCountryCode(foundCountry.dialCode);
      setPhoneNumber(user.phone.replace(foundCountry.dialCode, '').trim());
    } else {
      setPhoneNumber(user.phone);
    }
    setPinOrPassword(user.pinCode || '1234');
    setErrorMessage(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Active Session Notice if already logged in */}
      {connectedUser && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                connectedUser.role === 'MANAGER'
                  ? 'bg-amber-500/20 text-amber-900 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-900 border border-emerald-500/30'
              }`}
            >
              {connectedUser.firstName.charAt(0)}
              {connectedUser.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">
                  Session actuellement active :
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    connectedUser.role === 'MANAGER'
                      ? 'bg-stone-900 text-amber-400'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  {connectedUser.role === 'MANAGER'
                    ? `Manager (${connectedUser.managerDetails?.planCode})`
                    : `Membre (${connectedUser.memberDetails?.paymentMethod})`}
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {connectedUser.firstName} {connectedUser.lastName} • {connectedUser.city},{' '}
                {connectedUser.countryName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onNavigateToDashboard}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              Accéder au Tableau de Bord
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 border border-stone-200 hover:border-red-200 transition-colors flex items-center gap-1.5"
              title="Se déconnecter de cette session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Login Card Container */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Header Hero Section */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 text-white p-6 sm:p-8 border-b border-stone-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Portail d'Accès Sécurisé • UEMOA & Mobile Money
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Connexion à votre Espace TontinePay
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 max-w-xl">
                Gérez vos cercles de tontine, encaissez vos commissions de gestionnaire
                ou suivez et réglez vos cotisations de membre cotisant en toute sécurité.
              </p>
            </div>

            {/* Sub-tab pills */}
            <div className="inline-flex p-1 bg-stone-900 rounded-2xl border border-stone-800 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setActiveSubTab('form')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === 'form'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Identifiants
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('quick')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === 'quick'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Accès Démo 1-Clic
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-800 text-amber-300 font-mono">
                  {users.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          {activeSubTab === 'form' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form */}
              <div className="lg:col-span-7 space-y-6">
                {/* Method selector: Phone vs Email */}
                <div className="flex items-center justify-between p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('PHONE');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all ${
                      loginMethod === 'PHONE'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    Numéro Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('EMAIL');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all ${
                      loginMethod === 'EMAIL'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-amber-600" />
                    Adresse Email
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed">{errorMessage}</div>
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {loginMethod === 'PHONE' ? (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Numéro de Téléphone (Compte Mobile Money)
                      </label>
                      <div className="flex rounded-xl border border-stone-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 bg-white overflow-hidden transition-all">
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="bg-stone-50 border-r border-stone-200 text-xs font-semibold px-3 py-2.5 text-stone-800 focus:outline-none cursor-pointer shrink-0"
                        >
                          {SUPPORTED_COUNTRIES.map((c) => (
                            <option key={c.code} value={c.dialCode}>
                              {c.flag} {c.dialCode} ({c.name})
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Ex: 77 452 89 12 ou 07 88 14 23"
                          className="flex-1 px-3.5 py-2.5 text-xs text-stone-900 font-medium focus:outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Utilisé pour vous identifier et recevoir les notifications de rotation.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Adresse Email Professionnelle ou Personnelle
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          required
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="votre.nom@domaine.com"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs text-stone-900 font-medium focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Password or Security PIN */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        Code PIN Secret ou Mot de passe
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setPinOrPassword('1234');
                          setErrorMessage(null);
                        }}
                        className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:underline"
                      >
                        PIN Démo : 1234
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={pinOrPassword}
                        onChange={(e) => setPinOrPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs text-stone-900 font-mono tracking-wider focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600"
                        title={showPassword ? 'Masquer' : 'Afficher'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Options row */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-stone-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 border-stone-300 w-3.5 h-3.5"
                      />
                      <span>Mémoriser ma session</span>
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          'Pour cette démonstration, utilisez le code PIN par défaut "1234" ou cliquez directement sur l\'un des comptes de test à droite.'
                        )
                      }
                      className="text-xs font-semibold text-stone-500 hover:text-stone-800 hover:underline"
                    >
                      PIN oublié ?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                        <span>Vérification des identifiants...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Se Connecter à Mon Espace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Bottom switch to register */}
                <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-stone-600">Vous n'avez pas encore de compte ?</span>
                  <button
                    type="button"
                    onClick={onNavigateToRegister}
                    className="font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1"
                  >
                    Créer un compte Manager ou Membre
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Pre-filled Fast Login Cards */}
              <div className="lg:col-span-5 bg-stone-50 p-5 rounded-2xl border border-stone-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Comptes suggérés (1-Clic)
                    </h3>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono">PIN: 1234</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Cliquez sur un profil ci-dessous pour remplir instantanément le formulaire ou vous connecter directement :
                </p>

                <div className="space-y-2.5">
                  {/* Manager 1: Awa Diop */}
                  {managers[0] && (
                    <div className="p-3 bg-white rounded-xl border border-stone-200 hover:border-amber-400 transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                            AD
                          </div>
                          <div>
                            <div className="text-xs font-bold text-stone-900 group-hover:text-amber-800">
                              {managers[0].firstName} {managers[0].lastName}
                            </div>
                            <div className="text-[10px] text-stone-500">
                              Manager • Plan {managers[0].managerDetails?.planCode} (2,5%)
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(managers[0])}
                          className="px-2.5 py-1 bg-stone-900 hover:bg-amber-500 hover:text-stone-950 text-amber-400 text-[11px] font-bold rounded-lg transition-colors"
                        >
                          Connexion
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manager 2: Jean-Marc Kouassi */}
                  {managers[1] && (
                    <div className="p-3 bg-white rounded-xl border border-stone-200 hover:border-amber-400 transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                            JK
                          </div>
                          <div>
                            <div className="text-xs font-bold text-stone-900 group-hover:text-amber-800">
                              {managers[1].firstName} {managers[1].lastName}
                            </div>
                            <div className="text-[10px] text-stone-500">
                              Manager • Plan {managers[1].managerDetails?.planCode} (3,5%)
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(managers[1])}
                          className="px-2.5 py-1 bg-stone-900 hover:bg-amber-500 hover:text-stone-950 text-amber-400 text-[11px] font-bold rounded-lg transition-colors"
                        >
                          Connexion
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Member 1: Fatou Ndiaye */}
                  {members[0] && (
                    <div className="p-3 bg-white rounded-xl border border-stone-200 hover:border-emerald-400 transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            FN
                          </div>
                          <div>
                            <div className="text-xs font-bold text-stone-900 group-hover:text-emerald-800">
                              {members[0].firstName} {members[0].lastName}
                            </div>
                            <div className="text-[10px] text-stone-500">
                              Membre Cotisant • {members[0].city} (Wave)
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(members[0])}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-colors"
                        >
                          Connexion
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Member 2: Ibrahim Touré */}
                  {members[1] && (
                    <div className="p-3 bg-white rounded-xl border border-stone-200 hover:border-emerald-400 transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            IT
                          </div>
                          <div>
                            <div className="text-xs font-bold text-stone-900 group-hover:text-emerald-800">
                              {members[1].firstName} {members[1].lastName}
                            </div>
                            <div className="text-[10px] text-stone-500">
                              Membre Cotisant • {members[1].city} (Orange Money)
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin(members[1])}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-colors"
                        >
                          Connexion
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('quick')}
                    className="text-xs font-bold text-stone-600 hover:text-stone-900 hover:underline"
                  >
                    Voir tous les {users.length} comptes de test →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Sub-tab 2: Full Quick Login Directory */
            <div className="space-y-6">
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Sélectionnez un Compte pour vous Connecter
                  </h3>
                  <p className="text-xs text-stone-500">
                    Basculez instantanément pour tester les règles de commissions et les dashboards.
                  </p>
                </div>

                <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuickFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      quickFilter === 'ALL'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Tous ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFilter('MANAGERS')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      quickFilter === 'MANAGERS'
                        ? 'bg-stone-900 text-amber-400 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Managers ({managers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFilter('MEMBERS')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      quickFilter === 'MEMBERS'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Membres ({members.length})
                  </button>
                </div>
              </div>

              {/* Grid of Users */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => {
                  const isManager = user.role === 'MANAGER';
                  const isCurrent = connectedUser?.id === user.id;

                  return (
                    <div
                      key={user.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                          : 'border-stone-200 hover:border-stone-400 bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isManager
                                  ? 'bg-stone-900 text-amber-400'
                                  : 'bg-emerald-700 text-white'
                              }`}
                            >
                              {user.firstName.charAt(0)}
                              {user.lastName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-stone-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-[11px] text-stone-500">
                                {user.city}, {user.countryName}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isManager
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {isManager ? 'Manager' : 'Membre'}
                          </span>
                        </div>

                        {/* Details specs */}
                        {isManager && user.managerDetails ? (
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-[11px] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-stone-500">Plan souscrit :</span>
                              <span className="font-bold text-stone-900">
                                {user.managerDetails.planCode} (
                                {formatPercent(user.managerDetails.commissionRate)})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-500">Portefeuille :</span>
                              <span className="font-bold text-emerald-700">
                                {formatXOF(user.managerDetails.walletBalance)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-500">Retrait par :</span>
                              <span className="font-mono text-[10px] text-stone-700">
                                {user.managerDetails.payoutProvider}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-[11px] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-stone-500">Paiement :</span>
                              <span className="font-bold text-stone-900">
                                {user.memberDetails?.paymentMethod}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-500">Tontines actives :</span>
                              <span className="font-bold text-stone-700">
                                {user.memberDetails?.joinedTontinesCount || 0} cercle(s)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-stone-500">Téléphone :</span>
                              <span className="font-mono text-[10px] text-stone-700">
                                {user.phone}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        {isCurrent ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                            <CheckCircle2 className="w-4 h-4 text-amber-600" />
                            Session active
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickLogin(user)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                              isManager
                                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            Se connecter en tant que {user.firstName}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Informational Security Notice footer */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Chiffrement TLS 256-bit • Conformité aux règlements BCEAO & UEMOA sur la monnaie électronique.</span>
          </div>
          <div className="font-mono text-[11px] text-stone-400">
            TontinePay v2.4 • Démo Interactive
          </div>
        </div>
      </div>
    </div>
  );
}

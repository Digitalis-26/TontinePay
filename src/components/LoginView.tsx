import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Menu,
  AlertTriangle,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  Mail,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { RegisteredUser } from '../types';
import { SUPPORTED_COUNTRIES } from '../data/users';

interface LoginViewProps {
  users: RegisteredUser[];
  connectedUser: RegisteredUser | null;
  onLogin: (user: RegisteredUser) => void;
  onLogout?: () => void;
  onNavigateToRegister: () => void;
  onNavigateToDashboard: () => void;
  onSelectPlan?: (planCode: string) => void;
  onOpenTerms?: () => void;
}

export function LoginView({
  users,
  connectedUser,
  onLogin,
  onLogout,
  onNavigateToRegister,
  onNavigateToDashboard,
  onSelectPlan,
  onOpenTerms,
}: LoginViewProps) {
  const [loginMethod, setLoginMethod] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [emailInput, setEmailInput] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+221');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pinOrPassword, setPinOrPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(true);
  const [selectedPlanCode, setSelectedPlanCode] = useState<'STARTER' | 'PREMIUM'>('PREMIUM');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isHumanVerified) {
      setErrorMessage('Veuillez cocher la case de sécurité « Je suis un humain ».');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      let matchedUser: RegisteredUser | undefined;

      if (loginMethod === 'EMAIL') {
        const cleanEmail = emailInput.trim().toLowerCase();
        matchedUser = users.find(
          (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
        );
      } else {
        const cleanedEnteredPhone = (phoneCountryCode + phoneNumber).replace(/[\s\-\.]/g, '');
        matchedUser = users.find((u) => {
          const cleanUPhone = u.phone.replace(/[\s\-\.]/g, '');
          return cleanUPhone.endsWith(cleanedEnteredPhone.slice(-8)) || cleanUPhone === cleanedEnteredPhone;
        });
      }

      setIsSubmitting(false);

      if (users.length === 0) {
        setErrorMessage(
          "Aucun compte n'a encore été créé sur cette instance. Veuillez vous inscrire pour créer votre premier profil."
        );
        return;
      }

      if (!matchedUser) {
        setErrorMessage(
          loginMethod === 'EMAIL'
            ? `Aucun compte enregistré avec l'adresse "${emailInput}". Veuillez vérifier la saisie ou vous inscrire.`
            : `Aucun compte enregistré avec le numéro ${phoneCountryCode} ${phoneNumber}. Veuillez vérifier la saisie ou vous inscrire.`
        );
        return;
      }

      if (pinOrPassword.length < 4) {
        setErrorMessage('Le mot de passe ou code secret doit comporter au moins 4 caractères.');
        return;
      }

      const expectedPin = matchedUser.pinCode || matchedUser.password;
      if (expectedPin && pinOrPassword !== expectedPin) {
        setErrorMessage('Mot de passe ou code secret incorrect.');
        return;
      }

      onLogin(matchedUser);
    }, 450);
  };

  const handlePlanCardClick = (plan: 'STARTER' | 'PREMIUM') => {
    setSelectedPlanCode(plan);
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
    onNavigateToRegister();
  };

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${isDarkMode ? 'bg-stone-950 text-stone-100' : 'bg-[#FAFAF9] text-stone-900'}`}>
      {/* =========================================================================
          TOP NAVBAR - Faithful to screenshot layout with uniform green styling:
          Left: Circle Logo + TONTINE
          Right: Moon toggle, Se connecter button, Hamburger menu
          ========================================================================= */}
      <header className={`w-full flex items-center justify-between py-3.5 px-4 sm:px-8 border-b transition-colors ${
        isDarkMode ? 'bg-stone-900/95 border-emerald-900/40' : 'bg-white/95 border-emerald-200/80'
      } backdrop-blur-md sticky top-0 z-40`}>
        {/* Top-Left Brand: Circle Logo + TONTINE */}
        <div
          onClick={onNavigateToDashboard}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
          title="Retour à la plateforme TONTINE"
        >
          <div className="w-9 h-9 rounded-full border-2 border-emerald-600 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-black text-base transition-transform group-hover:scale-105 shadow-2xs bg-emerald-50 dark:bg-emerald-950/40">
            <span className="leading-none">T</span>
          </div>
          <span className="text-xl font-black tracking-tight text-emerald-700 dark:text-emerald-400">
            TONTINE
          </span>
        </div>

        {/* Top-Right Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl transition-colors cursor-pointer text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4 text-emerald-700" />}
          </button>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('login-form-card');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs border border-emerald-600 cursor-pointer"
          >
            Se connecter
          </button>

          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="p-2 rounded-xl transition-colors cursor-pointer text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            title="Menu & Accueil"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Form Content */}
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-10 space-y-6">
        {/* Hero Title: Bon retour 👋 */}
        <div className="text-center space-y-1.5">
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center justify-center gap-2 ${
            isDarkMode ? 'text-emerald-100' : 'text-emerald-950'
          }`}>
            <span>Bon retour</span>
            <span className="text-2xl sm:text-3xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-300/80 font-medium">
            Connecte-toi pour accéder à ta plateforme.
          </p>
        </div>

        {/* Main Card Container */}
        <div
          id="login-form-card"
          className={`rounded-3xl border-2 shadow-sm p-6 sm:p-7 space-y-4 transition-all ${
            isDarkMode
              ? 'bg-stone-900 border-emerald-900/50'
              : 'bg-white border-emerald-300/80'
          }`}
        >
          {/* Notice Card 1: Uniform Emerald Styling */}
          <div className={`border rounded-2xl p-3.5 flex items-start gap-3 transition-colors ${
            isDarkMode ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-200' : 'border-emerald-300/90 bg-emerald-50/70 text-emerald-900'
          }`}>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200">
              Les cycles de tontine respectent des échéances strictes. Pensez à vérifier votre solde Mobile Money avant chaque tour de versement.
            </p>
          </div>

          {/* Notice Card 2: Green soft tint style */}
          <div className={`border rounded-2xl p-3.5 flex items-start gap-3 ${
            isDarkMode
              ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-200'
              : 'border-emerald-300/90 bg-emerald-50/70 text-emerald-900'
          }`}>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-200">
              Versements et retraits automatisés Mobile Money (Wave, Orange, MTN, Moov) avec traçabilité intégrale et sans frais cachés.
            </p>
          </div>

          {/* Section Header: CONNEXION & Link */}
          <div className="flex items-center justify-between pt-1">
            <span className={`text-xs font-black tracking-wider uppercase ${
              isDarkMode ? 'text-emerald-200' : 'text-emerald-950'
            }`}>
              CONNEXION
            </span>
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 hover:underline cursor-pointer transition-colors"
            >
              Pas de compte ? S'inscrire
            </button>
          </div>

          {/* Selector: Email vs Phone */}
          <div className="flex items-center p-1 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('EMAIL');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                loginMethod === 'EMAIL'
                  ? 'bg-emerald-600 text-white shadow-xs border border-emerald-600'
                  : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100 hover:bg-emerald-100/50'
              }`}
            >
              <Mail className={`w-3.5 h-3.5 ${loginMethod === 'EMAIL' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('PHONE');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                loginMethod === 'PHONE'
                  ? 'bg-emerald-600 text-white shadow-xs border border-emerald-600'
                  : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100 hover:bg-emerald-100/50'
              }`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${loginMethod === 'PHONE' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
              <span>Numéro Mobile Money</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            {/* Identifier Input */}
            {loginMethod === 'EMAIL' ? (
              <div>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Email"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 transition-all ${
                    isDarkMode
                      ? 'bg-stone-950 border-emerald-800 text-white'
                      : 'bg-emerald-50/20 border-emerald-300 text-emerald-950'
                  }`}
                />
              </div>
            ) : (
              <div className={`flex rounded-xl border overflow-hidden focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/25 transition-all ${
                isDarkMode ? 'bg-stone-950 border-emerald-800' : 'bg-emerald-50/20 border-emerald-300'
              }`}>
                <select
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className={`px-2.5 py-2.5 text-xs font-semibold border-r focus:outline-none cursor-pointer ${
                    isDarkMode
                      ? 'bg-stone-900 border-emerald-800 text-white'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.dialCode}>
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Numéro Mobile Money (ex: 77 123 45 67)"
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono placeholder:text-stone-400 focus:outline-none bg-transparent text-emerald-950 dark:text-emerald-50"
                />
              </div>
            )}

            {/* Password Input with eye toggle */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={pinOrPassword}
                onChange={(e) => setPinOrPassword(e.target.value)}
                placeholder="Mot de passe (min. 4 caractères, majuscule + chiffre)"
                className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-xs placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 transition-all ${
                  isDarkMode
                    ? 'bg-stone-950 border-emerald-800 text-white'
                    : 'bg-emerald-50/20 border-emerald-300 text-emerald-950'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-600 hover:text-emerald-800 cursor-pointer"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Captcha "Je suis un humain" Box */}
            <div className={`border rounded-xl p-3 flex items-center justify-between ${
              isDarkMode
                ? 'bg-emerald-950/30 border-emerald-800/60'
                : 'bg-emerald-50/40 border-emerald-300'
            }`}>
              <label
                onClick={() => setIsHumanVerified(!isHumanVerified)}
                className="flex items-center gap-3 cursor-pointer select-none"
              >
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    isHumanVerified
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-stone-800 border-emerald-300 dark:border-emerald-700 hover:border-emerald-500'
                  }`}
                >
                  {isHumanVerified && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
                <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-100">
                  Je suis un humain
                </span>
              </label>

              <div className="flex flex-col items-center justify-center text-right pl-3">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-300 tracking-tight">hCaptcha</span>
                <span className="text-[7px] text-emerald-600/70">Confidentialité - Conditions</span>
              </div>
            </div>

            {/* Submit Button: Se connecter → */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md disabled:opacity-50 border border-emerald-600 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Section Divider & Plans: OU PASSEZ DIRECT EN ILLIMITÉ */}
          <div className="pt-3 text-center space-y-1 border-t border-emerald-200 dark:border-emerald-800">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-200 block">
              OU PASSEZ DIRECT EN ILLIMITÉ
            </span>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-snug">
              Choisis un plan ci-dessous puis inscris-toi. Tu seras envoyé direct au paiement.
            </p>
          </div>

          {/* Plan Card 1: Starter */}
          <div
            onClick={() => handlePlanCardClick('STARTER')}
            className={`border-2 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all ${
              selectedPlanCode === 'STARTER'
                ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-2xs'
                : 'border-emerald-300/80 dark:border-emerald-800/70 hover:border-emerald-500 bg-emerald-50/20 dark:bg-stone-900'
            }`}
          >
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-extrabold text-emerald-950 dark:text-emerald-100">
                  2 500 F CFA
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400">/mois</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Sans engagement</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedPlanCode === 'STARTER' ? 'border-emerald-600' : 'border-emerald-400 dark:border-emerald-600'
            }`}>
              {selectedPlanCode === 'STARTER' && (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              )}
            </div>
          </div>

          {/* Plan Card 2: Premium with "OFFRE DE LANCEMENT" badge */}
          <div
            onClick={() => handlePlanCardClick('PREMIUM')}
            className="relative border-2 border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer shadow-2xs transition-all"
          >
            <div className="absolute -top-2.5 right-5 bg-emerald-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
              OFFRE DE LANCEMENT
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                  5 000 F CFA
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">/mois</span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-200 font-medium">
                Paiement unique ou mensuel — accès à vie
              </p>
            </div>
            <div className="w-5 h-5 rounded-full border-2 border-emerald-600 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            </div>
          </div>
        </div>

        {/* Footer: Mentions légales, Politique, CGV, Burkina Faso */}
        <div className="pt-8 pb-4 text-center text-xs text-emerald-800 dark:text-emerald-300 space-y-2.5 border-t border-emerald-300/80 dark:border-emerald-800/80">
          <p className="font-semibold text-emerald-950 dark:text-emerald-100 tracking-wide">
            © 2026 Tontine. Tous droits réservés.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-emerald-700 dark:text-emerald-400">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
              Burkina Faso
            </span>
            <span className="text-emerald-400 dark:text-emerald-600">•</span>
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-emerald-950 dark:hover:text-emerald-100 hover:underline cursor-pointer transition-colors font-semibold"
            >
              Mentions légales
            </button>
            <span className="text-emerald-400 dark:text-emerald-600">•</span>
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-emerald-950 dark:hover:text-emerald-100 hover:underline cursor-pointer transition-colors font-semibold"
            >
              Politique de confidentialité
            </button>
            <span className="text-emerald-400 dark:text-emerald-600">•</span>
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-emerald-950 dark:hover:text-emerald-100 hover:underline cursor-pointer transition-colors font-semibold"
            >
              CGV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

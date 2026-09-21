import React, { useState } from 'react';
import {
  Smartphone,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { RegisteredUser } from '../types';
import { SUPPORTED_COUNTRIES } from '../data/users';

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
  const [loginMethod, setLoginMethod] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+221');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [pinOrPassword, setPinOrPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  // Handle standard form submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoNotice(null);
    setIsSubmitting(true);

    setTimeout(() => {
      let matchedUser: RegisteredUser | undefined;

      if (loginMethod === 'PHONE') {
        const cleanedEnteredPhone = (phoneCountryCode + phoneNumber).replace(/[\s\-\.]/g, '');
        matchedUser = users.find((u) => {
          const cleanUPhone = u.phone.replace(/[\s\-\.]/g, '');
          return cleanUPhone.endsWith(cleanedEnteredPhone.slice(-8)) || cleanUPhone === cleanedEnteredPhone;
        });
      } else {
        const cleanEmail = emailInput.trim().toLowerCase();
        matchedUser = users.find(
          (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
        );
      }

      setIsSubmitting(false);

      if (users.length === 0) {
        setErrorMessage(
          "Aucun compte n'a encore été créé sur cette instance. Veuillez vous inscrire via le bouton ci-dessous pour créer votre premier profil Gestionnaire ou Membre."
        );
        return;
      }

      if (!matchedUser) {
        setErrorMessage(
          loginMethod === 'PHONE'
            ? `Aucun compte enregistré avec le numéro ${phoneCountryCode} ${phoneNumber}. Veuillez vérifier la saisie ou créer un compte.`
            : `Aucun compte enregistré avec l'adresse "${emailInput}". Veuillez vérifier la saisie ou créer un compte.`
        );
        return;
      }

      // Check PIN/password: accept user's pinCode or password
      if (pinOrPassword.length < 4) {
        setErrorMessage('Le code secret ou mot de passe doit comporter au moins 4 caractères.');
        return;
      }

      const expectedPin = matchedUser.pinCode || matchedUser.password;
      if (expectedPin && pinOrPassword !== expectedPin) {
        setErrorMessage('Code secret ou mot de passe incorrect.');
        return;
      }

      // Successful login
      onLogin(matchedUser);
    }, 450);
  };

  const handleForgotPassword = () => {
    setInfoNotice(
      "Pour réinitialiser votre code PIN ou mot de passe, un code de validation SMS sera envoyé à votre numéro Mobile Money enregistré. Veuillez contacter votre gestionnaire de tontine ou le support."
    );
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
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
                  Session active :
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    connectedUser.role === 'MANAGER'
                      ? 'bg-stone-900 text-amber-400'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  {connectedUser.role === 'MANAGER' ? 'Manager' : 'Membre'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-stone-900">
                {connectedUser.firstName} {connectedUser.lastName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              Accéder au Tableau de Bord
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 border border-stone-200 hover:border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Login Card Container */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-5">
        <h2 className="text-xl font-bold text-stone-900 text-center">
          Connexion
        </h2>

        {/* Method selector: Phone vs Email */}
        <div className="flex items-center justify-between p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('PHONE');
              setErrorMessage(null);
              setInfoNotice(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all cursor-pointer ${
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
              setInfoNotice(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all cursor-pointer ${
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
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {infoNotice && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 animate-fadeIn">
            {infoNotice}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {loginMethod === 'PHONE' ? (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Numéro de Téléphone
              </label>
              <div className="flex rounded-xl border border-stone-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 bg-white overflow-hidden transition-all">
                <select
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="bg-stone-50 border-r border-stone-300 px-3 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
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
                  placeholder="77 123 45 67"
                  className="flex-1 px-3.5 py-2.5 text-xs text-stone-900 font-mono focus:outline-none bg-transparent"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Adresse Email
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
                  placeholder="nom@exemple.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs text-stone-900 font-medium focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Password or PIN */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              Code PIN ou Mot de passe
            </label>
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
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
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
              onClick={handleForgotPassword}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 hover:underline cursor-pointer"
            >
              Code oublié ?
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
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <span>Se Connecter</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Bottom switch to register */}
        <div className="pt-4 border-t border-stone-200 text-center text-xs">
          <span className="text-stone-600">Vous n'avez pas encore de compte ? </span>
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
          >
            Créer un nouveau compte
          </button>
        </div>
      </div>
    </div>
  );
}

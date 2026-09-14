import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { RegisteredUser, KycVerificationData, KycDocumentType, KycStatus } from '../types';
import { SUPPORTED_COUNTRIES } from '../data/users';
import { formatXOF } from '../data/plans';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Camera,
  Upload,
  CreditCard,
  Lock,
  Phone,
  Mail,
  MapPin,
  Building2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  Award,
  ChevronRight,
  Info,
  X,
  Sliders,
  LogIn,
  UserPlus,
  Scale,
} from 'lucide-react';
import { TermsModal } from './TermsModal';

interface ProfileViewProps {
  user: RegisteredUser | null;
  onUpdateUser: (updatedUser: RegisteredUser) => void;
  onNavigateToDashboard: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

export function ProfileView({
  user,
  onUpdateUser,
  onNavigateToDashboard,
  onNavigateToLogin,
  onNavigateToRegister,
}: ProfileViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'kyc' | 'personal' | 'limits'>('kyc');
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Personal Info Form State
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [city, setCity] = useState(user?.city || '');
  const [countryCode, setCountryCode] = useState(user?.countryCode || 'CI');
  const [pinCode, setPinCode] = useState(user?.pinCode || '');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // KYC Submission Form State
  const currentKyc: KycVerificationData = user?.kyc || {
    status: user?.memberDetails?.identityNumber ? 'VERIFIED' : 'UNVERIFIED',
    level: user?.memberDetails?.identityNumber ? 2 : 1,
    documentType: 'NATIONAL_ID',
    documentNumber: user?.memberDetails?.identityNumber || '',
  };

  const [docType, setDocType] = useState<KycDocumentType>(currentKyc.documentType || 'NATIONAL_ID');
  const [docNumber, setDocNumber] = useState(currentKyc.documentNumber || '');
  const [docExpiry, setDocExpiry] = useState(currentKyc.documentExpiryDate || '2029-12-31');
  const [frontFile, setFrontFile] = useState<string | null>(currentKyc.frontDocumentFileName || null);
  const [backFile, setBackFile] = useState<string | null>(currentKyc.backDocumentFileName || null);
  const [selfieFile, setSelfieFile] = useState<string | null>(currentKyc.selfieFileName || null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  const [kycFeedback, setKycFeedback] = useState<string | null>(null);

  // Sync state when connected user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email || '');
      setCity(user.city || '');
      setCountryCode(user.countryCode);
      setPinCode(user.pinCode || '');

      const kyc = user.kyc || {
        status: user.memberDetails?.identityNumber ? 'VERIFIED' : 'UNVERIFIED',
        level: user.memberDetails?.identityNumber ? 2 : 1,
        documentType: 'NATIONAL_ID',
        documentNumber: user.memberDetails?.identityNumber || '',
      };
      setDocType(kyc.documentType || 'NATIONAL_ID');
      setDocNumber(kyc.documentNumber || '');
      setDocExpiry(kyc.documentExpiryDate || '2029-12-31');
      setFrontFile(kyc.frontDocumentFileName || null);
      setBackFile(kyc.backDocumentFileName || null);
      setSelfieFile(kyc.selfieFileName || null);
    }
  }, [user?.id]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Espace Profil & Vérification KYC</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Connectez-vous à votre compte pour mettre à jour vos coordonnées, transmettre vos pièces d'identité officielles et débloquer les plafonds de retraits et de cotisations UEMOA.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onNavigateToLogin && (
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Se connecter</span>
            </button>
          )}
          {onNavigateToRegister && (
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Créer un compte</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const isManager = user.role === 'MANAGER';
  const country = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode) || SUPPORTED_COUNTRIES[0];

  // Save personal details
  const handleSavePersonalInfo = (e: FormEvent) => {
    e.preventDefault();
    const updated: RegisteredUser = {
      ...user,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      countryCode,
      countryName: country.name,
      pinCode: pinCode.trim() || user.pinCode,
    };
    onUpdateUser(updated);
    setSaveSuccess('Informations personnelles mises à jour avec succès !');
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  // Submit KYC
  const handleSubmitKyc = (instantVerify: boolean = false) => {
    if (!docNumber.trim()) {
      alert('Veuillez renseigner le numéro de la pièce d\'identité.');
      return;
    }

    setIsSubmittingKyc(true);
    setTimeout(() => {
      const newStatus: KycStatus = instantVerify ? 'VERIFIED' : 'PENDING';
      const updatedKyc: KycVerificationData = {
        status: newStatus,
        level: instantVerify ? 2 : 1,
        documentType: docType,
        documentNumber: docNumber.trim(),
        documentExpiryDate: docExpiry,
        frontDocumentFileName: frontFile || `${docType.toLowerCase()}_recto_${user.id}.jpg`,
        backDocumentFileName: backFile || `${docType.toLowerCase()}_verso_${user.id}.jpg`,
        selfieFileName: selfieFile || `selfie_verification_${user.id}.jpg`,
        submittedAt: new Date().toISOString(),
        verifiedAt: instantVerify ? new Date().toISOString() : undefined,
        fullNameMatched: true,
      };

      const updated: RegisteredUser = {
        ...user,
        kyc: updatedKyc,
        memberDetails: user.memberDetails
          ? {
              ...user.memberDetails,
              identityNumber: docNumber.trim(),
            }
          : undefined,
      };

      onUpdateUser(updated);
      setIsSubmittingKyc(false);
      setKycFeedback(
        instantVerify
          ? 'Félicitations ! Votre identité a été validée avec succès (Niveau 2 vérifié).'
          : 'Dossier transmis avec succès aux équipes de conformité UEMOA. Examen sous 15 minutes.'
      );
      setTimeout(() => setKycFeedback(null), 5000);
    }, 800);
  };

  const handleSimulateFileSelect = (field: 'front' | 'back' | 'selfie') => {
    const fakeNames: Record<string, string> = {
      front: `cni_recto_${user.lastName.toLowerCase()}.jpg`,
      back: `cni_verso_${user.lastName.toLowerCase()}.jpg`,
      selfie: `selfie_biometrique_${user.firstName.toLowerCase()}.jpg`,
    };
    if (field === 'front') setFrontFile(fakeNames.front);
    if (field === 'back') setBackFile(fakeNames.back);
    if (field === 'selfie') setSelfieFile(fakeNames.selfie);
  };

  const getDocTypeName = (type: KycDocumentType) => {
    switch (type) {
      case 'NATIONAL_ID':
        return "Carte Nationale d'Identité (CNI / CEDEAO)";
      case 'PASSPORT':
        return 'Passeport biométrique';
      case 'DRIVING_LICENSE':
        return 'Permis de conduire numérisé';
      case 'RESIDENCE_PERMIT':
        return 'Carte consulaire / Titre de séjour';
      default:
        return 'Pièce d\'identité';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Card with Identity Summary & KYC Status */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-md ${
                isManager
                  ? 'bg-amber-400 text-slate-950 border-2 border-amber-300'
                  : 'bg-emerald-500 text-white border-2 border-emerald-400'
              }`}
            >
              {user.firstName.charAt(0)}
              {user.lastName.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {user.firstName} {user.lastName}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isManager
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                  }`}
                >
                  {isManager ? 'Gestionnaire' : 'Membre Cotisant'}
                </span>
                {isManager && user.managerDetails?.planCode && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/20">
                    Plan {user.managerDetails.planCode}
                  </span>
                )}
              </div>

              <div className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{user.phone}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {user.countryName} ({user.city || 'Ville non définie'})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* KYC Status Badge in Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-left">
              <div className="text-[11px] text-slate-300 font-medium">Statut de vérification</div>
              <div className="flex items-center gap-2 mt-0.5">
                {currentKyc.status === 'VERIFIED' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm font-bold text-emerald-300">
                      Vérifié (Niveau {currentKyc.level})
                    </span>
                  </>
                ) : currentKyc.status === 'PENDING' ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-sm font-bold text-amber-300">En cours d'examen</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="text-sm font-bold text-orange-300">Non vérifié</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
            >
              <span>Tableau de bord</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('kyc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'kyc'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Vérification KYC (Identité)</span>
            {currentKyc.status === 'VERIFIED' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'personal'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Informations & Coordonnées</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('limits')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'limits'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Plafonds & Réglementation UEMOA</span>
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {kycFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{kycFeedback}</span>
        </div>
      )}

      {/* =========================================================================
          TAB 1: VÉRIFICATION KYC (IDENTITÉ)
          ========================================================================= */}
      {activeSubTab === 'kyc' && (
        <div className="space-y-6">
          {/* Progress Tracker (3 Levels) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Paliers de Conformité & Niveaux de Vérification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Conforme aux directives BCEAO et UEMOA sur la lutte anti-blanchiment (LCB-FT).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Niveau 1 : Téléphone
                  </span>
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900">Numéro Mobile Money Validé</div>
                <div className="text-xs text-slate-600">
                  Cotisations autorisées jusqu'à 200 000 F CFA / mois.
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  currentKyc.status === 'VERIFIED'
                    ? 'bg-emerald-50 border-emerald-200'
                    : currentKyc.status === 'PENDING'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      currentKyc.status === 'VERIFIED'
                        ? 'text-emerald-800'
                        : currentKyc.status === 'PENDING'
                        ? 'text-amber-800'
                        : 'text-slate-600'
                    }`}
                  >
                    Niveau 2 : Pièce d'Identité
                  </span>
                  {currentKyc.status === 'VERIFIED' ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  ) : currentKyc.status === 'PENDING' ? (
                    <Clock className="w-4 h-4 text-amber-600" />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Requis</span>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900">CNI, Passeport ou Permis</div>
                <div className="text-xs text-slate-600">
                  Débloque les collectes et retraits jusqu'à 2 000 000 F CFA / mois.
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  currentKyc.level >= 3
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Niveau 3 : Biométrie & Domicile
                  </span>
                  {currentKyc.level >= 3 ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Gestionnaire Pro</span>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900">Plafond Illimité (10M+ F)</div>
                <div className="text-xs text-slate-600">
                  Selfie biométrique et attestation Mobile Money Wave/Orange.
                </div>
              </div>
            </div>
          </div>

          {/* If already verified: Card of Status & Verified Details */}
          {currentKyc.status === 'VERIFIED' ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Identité Vérifiée et Conforme
                    </h3>
                    <p className="text-xs text-slate-500">
                      Votre compte bénéficie des plafonds étendus pour toutes vos tontines.
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold self-start sm:self-center">
                  <CheckCircle2 className="w-4 h-4" />
                  Certifié Niveau {currentKyc.level}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-medium">Type de pièce</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {getDocTypeName(currentKyc.documentType || 'NATIONAL_ID')}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-medium">Numéro de pièce</div>
                  <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                    {currentKyc.documentNumber
                      ? `${currentKyc.documentNumber.slice(0, 4)}••••${currentKyc.documentNumber.slice(-3)}`
                      : 'CI••••921'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-medium">Délivrance / Expiration</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {currentKyc.documentExpiryDate || '31/12/2029'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500 font-medium">Date de validation</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1">
                    {currentKyc.verifiedAt
                      ? new Date(currentKyc.verifiedAt).toLocaleDateString('fr-FR')
                      : '14/09/2025'}
                  </div>
                </div>
              </div>

              {/* Action to update document */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 text-xs">
                <div className="text-slate-500 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Une pièce expire ? Vous pouvez soumettre un nouveau document.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated: RegisteredUser = {
                      ...user,
                      kyc: {
                        ...currentKyc,
                        status: 'UNVERIFIED',
                      },
                    };
                    onUpdateUser(updated);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Mettre à jour ma pièce d'identité
                </button>
              </div>
            </div>
          ) : currentKyc.status === 'PENDING' ? (
            /* Pending Card */
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-amber-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Dossier KYC en cours de traitement
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nos opérateurs de conformité analysent votre pièce d'identité. Délai moyen : 15 minutes.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 text-xs text-amber-950">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Documents réceptionnés :
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li>Pièce : {getDocTypeName(currentKyc.documentType || 'NATIONAL_ID')}</li>
                  <li>Numéro : <span className="font-mono font-bold">{currentKyc.documentNumber}</span></li>
                  <li>Recto : <span className="font-mono">{currentKyc.frontDocumentFileName || 'reçu.jpg'}</span></li>
                  <li>Verso : <span className="font-mono">{currentKyc.backDocumentFileName || 'reçu.jpg'}</span></li>
                </ul>
              </div>

              {/* Quick simulation for test */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Pour tester immédiatement les fonctions avancées :
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmitKyc(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valider immédiatement (Simulation Test)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Unverified Form */
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Formulaire de Vérification d'Identité (KYC)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fournissez une pièce officielle en cours de validité pour débloquer les plafonds
                  et assurer la transparence entre tous les membres de la tontine.
                </p>
              </div>

              <div className="space-y-4">
                {/* Document Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Type de document officiel *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { type: 'NATIONAL_ID' as KycDocumentType, label: "Carte Nationale d'Identité (CNI)" },
                      { type: 'PASSPORT' as KycDocumentType, label: 'Passeport biométrique' },
                      { type: 'DRIVING_LICENSE' as KycDocumentType, label: 'Permis de conduire CEDEAO' },
                      { type: 'RESIDENCE_PERMIT' as KycDocumentType, label: 'Carte Consulaire / Séjour' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setDocType(item.type)}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          docType === item.type
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{item.label}</span>
                        {docType === item.type && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Number & Expiry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Numéro de la pièce (ex: CNI N°, NINA, N° Passeport) *
                    </label>
                    <input
                      type="text"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      placeholder="ex: CI00293849102"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Date d'expiration *
                    </label>
                    <input
                      type="date"
                      value={docExpiry}
                      onChange={(e) => setDocExpiry(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Upload Zones for Front, Back, and Selfie */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Front */}
                  <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/30 transition-all text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">Recto de la pièce *</div>
                    <div className="text-[11px] text-slate-500">Photo nette, sans reflets</div>
                    {frontFile ? (
                      <div className="text-[11px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-1 rounded-md truncate">
                        ✓ {frontFile}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSimulateFileSelect('front')}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Téléverser Recto
                      </button>
                    )}
                  </div>

                  {/* Back */}
                  <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/30 transition-all text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">Verso de la pièce *</div>
                    <div className="text-[11px] text-slate-500">Face arrière de la carte</div>
                    {backFile ? (
                      <div className="text-[11px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-1 rounded-md truncate">
                        ✓ {backFile}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSimulateFileSelect('back')}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Téléverser Verso
                      </button>
                    )}
                  </div>

                  {/* Selfie */}
                  <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/30 transition-all text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                      <Camera className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">Selfie Portrait *</div>
                    <div className="text-[11px] text-slate-500">Visage bien éclairé</div>
                    {selfieFile ? (
                      <div className="text-[11px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-1 rounded-md truncate">
                        ✓ {selfieFile}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSimulateFileSelect('selfie')}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        Prendre un Selfie
                      </button>
                    )}
                  </div>
                </div>

                {/* Certification checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      Je certifie sur l'honneur que les documents fournis sont authentiques et
                      correspondent au titulaire du compte Mobile Money utilisé sur la plateforme.
                    </span>
                  </label>
                </div>

                {/* Submission buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isSubmittingKyc || !consentChecked}
                    onClick={() => handleSubmitKyc(false)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingKyc ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Envoi du dossier...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Soumettre mon dossier KYC</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmitKyc(true)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Valider immédiatement (Simulation Test)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: INFORMATIONS PERSONNELLES & PARAMÈTRES
          ========================================================================= */}
      {activeSubTab === 'personal' && (
        <form onSubmit={handleSavePersonalInfo} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Informations Personnelles & Coordonnées
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mettez à jour vos coordonnées de contact et de paiement.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
              ID : {user.id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Prénom *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nom de famille *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Adresse Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@exemple.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Numéro Mobile Money</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={user.phone}
                  readOnly
                  disabled
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-semibold text-slate-600"
                />
              </div>
              <span className="text-[10px] text-slate-400">
                Lié à la conformité KYC. Contactez le support pour modifier le numéro principal.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Pays de résidence</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                {SUPPORTED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.dialCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Ville de résidence</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="ex: Abidjan, Dakar, Cotonou"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Code PIN de sécurité (4 chiffres)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  maxLength={4}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 tracking-widest"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 3: PLAFONDS UEMOA & CONFORMITÉ
          ========================================================================= */}
      {activeSubTab === 'limits' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Plafonds de Transactions et Directives UEMOA / BCEAO
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Les paliers de transaction sont fixés conformément aux règlements des banques centrales
              sur la monnaie électronique et la protection des fonds communautaires.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                    Niveau 1
                  </span>
                  <span className="font-bold text-slate-900 text-sm">Compte Standard (Téléphone)</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Plafond mensuel de versement : <strong>200 000 F CFA</strong> • Retraits hebdomadaires limités à 50 000 F CFA.
                </div>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                Plafond basique
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 text-[10px] font-bold uppercase">
                    Niveau 2
                  </span>
                  <span className="font-bold text-emerald-950 text-sm">Compte Vérifié (Pièce CNI / Passeport)</span>
                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">Recommandé</span>
                </div>
                <div className="text-xs text-emerald-900 mt-1">
                  Plafond mensuel : <strong>2 000 000 F CFA</strong> • Retraits prioritaires instantanés vers Wave, Orange Money et MTN.
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                Déplafonnement x10
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-800 text-[10px] font-bold uppercase">
                    Niveau 3
                  </span>
                  <span className="font-bold text-amber-950 text-sm">Compte Gestionnaire Pro (Biométrie & Domicile)</span>
                </div>
                <div className="text-xs text-amber-900 mt-1">
                  Plafond mensuel : <strong>10 000 000 F CFA à Illimité</strong> • Gestion de tontines multiples en parallèle.
                </div>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-white px-3 py-1.5 rounded-xl border border-amber-200">
                Plafond Professionnel
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs space-y-2">
            <div className="font-bold flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Garantie de Sécurisation des Données</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Vos pièces d'identité sont chiffrées de bout en bout (AES-256) et ne sont jamais partagées avec les autres membres de la tontine. Seul votre statut de vérification est affiché pour attester de la fiabilité du groupe.
            </p>
          </div>

          {/* Terms & Confidence Charter Reference Card */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">
                  Politique d'Utilisation & Charte de Confiance TONTINE
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Acceptée
                </span>
              </div>
              <p className="text-[11px] text-slate-600 max-w-xl">
                Document contractuel opposable régissant les droits et devoirs des Gestionnaires et des Membres cotisants conformément aux directives BCEAO / UEMOA.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Consulter la Charte</span>
            </button>
          </div>
        </div>
      )}

      {/* Terms & Policy Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        highlightRole={user.role}
        alreadyAccepted={true}
      />
    </div>
  );
}

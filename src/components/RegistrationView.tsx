import { useState, FormEvent } from 'react';
import { RegisteredUser, UserRoleType, PlanConfig } from '../types';
import { SUPPORTED_COUNTRIES } from '../data/users';
import { formatPercent, formatXOF } from '../data/plans';
import { verifyOtpRequestGuard } from '../utils/security';
import {
  UserCheck,
  Briefcase,
  Users,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  Lock,
  Wallet,
  Coins,
  ArrowRight,
  Code2,
  Copy,
  Search,
  Filter,
  Eye,
  CreditCard,
  Sparkles,
  MapPin,
  AlertCircle,
  HelpCircle,
  LayoutDashboard,
  Scale,
  ExternalLink,
} from 'lucide-react';
import { TermsModal } from './TermsModal';

interface RegistrationViewProps {
  plans: PlanConfig[];
  currentRates: Record<PlanConfig['code'], number>;
  users: RegisteredUser[];
  onAddUser: (user: RegisteredUser) => void;
  onSelectManagerForSimulation?: (planCode: PlanConfig['code']) => void;
  onLoginAsUser?: (user: RegisteredUser) => void;
  onNavigateToLogin?: () => void;
}

export function RegistrationView({
  plans,
  currentRates,
  users,
  onAddUser,
  onSelectManagerForSimulation,
  onLoginAsUser,
  onNavigateToLogin,
}: RegistrationViewProps) {
  // Main view mode: form or directory
  const [viewMode, setViewMode] = useState<'form' | 'directory'>('form');

  // Selected registration role
  const [selectedRole, setSelectedRole] = useState<UserRoleType>('MANAGER');

  // Common form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('CI');
  const [city, setCity] = useState('Abidjan');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Manager-specific fields
  const [businessName, setBusinessName] = useState('');
  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanConfig['code']>('STARTER');
  const [managerCommissionRate, setManagerCommissionRate] = useState<number>(0.025);
  const [payoutProvider, setPayoutProvider] = useState<'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANK_TRANSFER'>('WAVE');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [commissionEnabled, setCommissionEnabled] = useState(true);

  // Member-specific fields
  const [memberPaymentMethod, setMemberPaymentMethod] = useState<'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'CASH'>('WAVE');
  const [identityNumber, setIdentityNumber] = useState('');
  const [tontineInvitationCode, setTontineInvitationCode] = useState('');

  // UI state
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MANAGER' | 'MEMBER'>('ALL');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const selectedCountry = SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountryCode) || SUPPORTED_COUNTRIES[0];

  // Keep manager default commission aligned with selected plan ceiling
  const handleSelectPlan = (planCode: PlanConfig['code']) => {
    setSelectedPlanCode(planCode);
    const planMaxRate = currentRates[planCode] ?? 0.025;
    setManagerCommissionRate(planMaxRate);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'Le prénom est requis';
    if (!lastName.trim()) errors.lastName = 'Le nom est requis';
    if (!phone.trim()) {
      errors.phone = 'Le numéro de téléphone est requis';
    } else if (phone.replace(/\D/g, '').length < 8) {
      errors.phone = 'Format de téléphone invalide (au moins 8 chiffres)';
    } else {
      const fullPhone = phone.startsWith('+') ? phone : `${selectedCountry.dialCode} ${phone}`;
      const guardResult = verifyOtpRequestGuard(fullPhone);
      if (!guardResult.allowed) {
        errors.phone = guardResult.reason || 'Numéro non autorisé par la politique anti-fraude.';
      }
    }

    if (selectedRole === 'MANAGER') {
      if (!businessName.trim()) {
        errors.businessName = 'Le nom commercial ou de structure est requis';
      }
    }

    if (password && password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!termsAccepted) {
      errors.terms = "Vous devez accepter la Politique d'Utilisation et la Charte de Confiance pour continuer.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    const country = SUPPORTED_COUNTRIES.find((c) => c.code === code);
    if (country) {
      setCity(country.defaultCity);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const fullPhone = phone.startsWith('+') ? phone : `${selectedCountry.dialCode} ${phone}`;
    const newId = `usr-${selectedRole.toLowerCase()}-${Date.now().toString().slice(-4)}`;

    const newUser: RegisteredUser = {
      id: newId,
      role: selectedRole,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: fullPhone,
      email: email.trim() || undefined,
      city: city.trim() || selectedCountry.defaultCity,
      countryCode: selectedCountry.code,
      countryName: selectedCountry.name,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      acceptedTerms: true,
      acceptedTermsAt: new Date().toISOString(),
      ...(selectedRole === 'MANAGER'
        ? {
            managerDetails: {
              businessName: businessName.trim(),
              planCode: selectedPlanCode,
              commissionRate: managerCommissionRate,
              commissionEnabled,
              payoutProvider,
              payoutAccount: payoutAccount.trim() || fullPhone,
              activeTontinesCount: 0,
              walletBalance: 0,
            },
          }
        : {
            memberDetails: {
              paymentMethod: memberPaymentMethod,
              identityNumber: identityNumber.trim() || undefined,
              tontineInvitationCode: tontineInvitationCode.trim() || undefined,
              joinedTontinesCount: tontineInvitationCode.trim() ? 1 : 0,
            },
          }),
    };

    onAddUser(newUser);

    setSuccessBanner(
      selectedRole === 'MANAGER'
        ? `Le gestionnaire "${businessName}" (${firstName} ${lastName}) a été enregistré avec le plan ${selectedPlanCode} (taux de commission : ${formatPercent(managerCommissionRate)}).`
        : `Le membre cotisant "${firstName} ${lastName}" a été enregistré avec succès (paiement : ${memberPaymentMethod}).`
    );

    // Reset form
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setBusinessName('');
    setPayoutAccount('');
    setIdentityNumber('');
    setTontineInvitationCode('');
    setTermsAccepted(false);
    setFormErrors({});

    // Switch to directory after short delay to show result
    setTimeout(() => {
      setViewMode('directory');
    }, 1200);
  };

  // Generate Prisma snippet based on current inputs
  const fullPhonePreview = phone.trim()
    ? (phone.startsWith('+') ? phone : `${selectedCountry.dialCode} ${phone}`)
    : `${selectedCountry.dialCode} 07 12 34 56 78`;

  const prismaSnippet =
    selectedRole === 'MANAGER'
      ? `// Inscription d'un Gestionnaire (Prisma ORM Transaction)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const newManager = await prisma.$transaction(async (tx) => {
  // 1. Création de l'utilisateur central
  const user = await tx.user.create({
    data: {
      phone: "${fullPhonePreview}",
      email: "${email.trim() || `${firstName.toLowerCase() || 'contact'}@${businessName ? businessName.toLowerCase().replace(/\\s+/g, '-') : 'tontine'}.org`}",
      firstName: "${firstName.trim() || 'Prénom'}",
      lastName: "${lastName.trim() || 'Nom'}",
      status: "ACTIVE",
      timezone: "${selectedCountry.code === 'CI' ? 'Africa/Abidjan' : 'Africa/Dakar'}",
      roles: {
        create: {
          role: { connect: { name: "ROLE_MANAGER" } }
        }
      }
    }
  });

  // 2. Profil Gestionnaire avec rattachement du plan ${selectedPlanCode} (${formatPercent(managerCommissionRate)} max)
  const manager = await tx.manager.create({
    data: {
      userId: user.id,
      businessName: "${businessName.trim() || 'Nom de la structure'}",
      commissionEnabled: ${commissionEnabled},
    }
  });

  // 3. Souscription au plan d'abonnement ${selectedPlanCode}
  const plan = await tx.subscriptionPlan.findUnique({
    where: { code: "${selectedPlanCode}" }
  });

  await tx.subscription.create({
    data: {
      managerId: manager.id,
      planId: plan!.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
    }
  });

  // 4. Création du Wallet XOF pour percevoir les commissions
  const wallet = await tx.wallet.create({
    data: {
      managerId: manager.id,
      currency: "XOF",
      balance: BigInt(0),
      status: "ACTIVE"
    }
  });

  return { user, manager, wallet };
});`
      : `// Inscription d'un Membre Cotisant (Prisma ORM Transaction)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const newMember = await prisma.$transaction(async (tx) => {
  // 1. Création du compte utilisateur cotisant
  const user = await tx.user.create({
    data: {
      phone: "${fullPhonePreview}",
      email: ${email.trim() ? `"${email.trim()}"` : 'null'},
      firstName: "${firstName.trim() || 'Prénom'}",
      lastName: "${lastName.trim() || 'Nom'}",
      status: "ACTIVE",
      roles: {
        create: {
          role: { connect: { name: "ROLE_MEMBER" } }
        }
      }
    }
  });

  // 2. Si un code tontine d'invitation est fourni :
  ${
    tontineInvitationCode.trim()
      ? `const tontine = await tx.tontine.findFirst({
    where: { code: "${tontineInvitationCode.trim()}" }
  });
  if (tontine) {
    await tx.tontineMember.create({
      data: {
        tontineId: tontine.id,
        userId: user.id,
        membershipStatus: "ACTIVE",
      }
    });
  }`
      : `// Membre prêt à rejoindre des tontines publiques ou sur invitation`
  }

  return user;
});`;

  const copySnippet = () => {
    navigator.clipboard.writeText(prismaSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filtered users for the directory
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      u.firstName.toLowerCase().includes(query) ||
      u.lastName.toLowerCase().includes(query) ||
      u.phone.toLowerCase().includes(query) ||
      (u.managerDetails?.businessName || '').toLowerCase().includes(query) ||
      (u.city || '').toLowerCase().includes(query);
    return matchesRole && matchesSearch;
  });

  const managersCount = users.filter((u) => u.role === 'MANAGER').length;
  const membersCount = users.filter((u) => u.role === 'MEMBER').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-800 border border-amber-500/20">
              Module Utilisateurs & RBAC
            </span>
            <span className="text-xs text-stone-400 font-mono">• PostgreSQL / Prisma</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mt-1">
            Portail d'Inscription des Membres et Managers
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Gérez l'onboarding des cotisants et des gestionnaires avec leurs règles de commissions respectives.
          </p>
        </div>

        {/* View Toggle & Login Shortcut */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToLogin && (
            <button
              onClick={onNavigateToLogin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              Déjà un compte ? Se connecter
            </button>
          )}

          <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-medium shrink-0">
            <button
              onClick={() => setViewMode('form')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
                viewMode === 'form'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              Nouvelle Inscription
            </button>
            <button
              onClick={() => setViewMode('directory')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
                viewMode === 'directory'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-600" />
              Comptes Inscrits
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700 font-mono">
                {users.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-semibold text-[11px]"
          >
            Fermer
          </button>
        </div>
      )}

      {/* VIEW 1: REGISTRATION FORM */}
      {viewMode === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Role Switcher Cards */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                1. Choisissez le profil du compte à inscrire
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Manager Role Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('MANAGER')}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    selectedRole === 'MANAGER'
                      ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    {selectedRole === 'MANAGER' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950">
                        Sélectionné
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm mt-3">Gestionnaire (Manager)</h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Crée et administre des tontines, perçoit des commissions (Free 1,5%, Starter 2,5%, Premium 3%, Business 3,5%) et gère le grand livre.
                  </p>
                  <div className="mt-3 pt-3 border-t border-stone-200/80 flex items-center gap-2 text-[11px] font-medium text-amber-800">
                    <Coins className="w-3.5 h-3.5" />
                    Bénéficiaire des commissions
                  </div>
                </button>

                {/* Member Role Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('MEMBER')}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    selectedRole === 'MEMBER'
                      ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    {selectedRole === 'MEMBER' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950">
                        Sélectionné
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm mt-3">Membre (Cotisant)</h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Participe aux cagnottes, verse ses cotisations par Mobile Money (Wave, Orange, MTN, Moov) et reçoit les versements de rotation.
                  </p>
                  <div className="mt-3 pt-3 border-t border-stone-200/80 flex items-center gap-2 text-[11px] font-medium text-emerald-800">
                    <CreditCard className="w-3.5 h-3.5" />
                    Cotisations & Réceptions de cagnottes
                  </div>
                </button>
              </div>
            </div>

            {/* Inscription Form */}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <div className="border-b border-stone-100 pb-4">
                <h3 className="text-base font-bold text-stone-900">
                  {selectedRole === 'MANAGER'
                    ? '2. Informations du Gestionnaire & de la Structure'
                    : '2. Informations du Membre Cotisant'}
                </h3>
                <p className="text-xs text-stone-500">
                  Tous les champs marqués d'une étoile (*) sont requis.
                </p>
              </div>

              {/* Manager: Business Name */}
              {selectedRole === 'MANAGER' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-stone-500" />
                    Nom de l'organisation ou de la tontine *
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ex: GIE Solidarité Plateau, Cercle d'Épargne Teranga..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                      formErrors.businessName ? 'border-red-400 bg-red-50/20' : 'border-stone-300'
                    }`}
                  />
                  {formErrors.businessName && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.businessName}
                    </p>
                  )}
                </div>
              )}

              {/* Names row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Prénom *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: Awa, Ibrahim, Koffi..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                      formErrors.firstName ? 'border-red-400 bg-red-50/20' : 'border-stone-300'
                    }`}
                  />
                  {formErrors.firstName && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.firstName}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Nom de famille *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Diop, Konan, Traoré..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                      formErrors.lastName ? 'border-red-400 bg-red-50/20' : 'border-stone-300'
                    }`}
                  />
                  {formErrors.lastName && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Country & Phone row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-500" />
                    Pays de résidence *
                  </label>
                  <select
                    value={selectedCountryCode}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-7 space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-500" />
                    Numéro de Téléphone (Mobile Money) *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-stone-300 bg-stone-100 text-stone-600 text-xs font-mono">
                      {selectedCountry.dialCode}
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07 88 12 34 56"
                      className={`flex-1 px-3.5 py-2.5 rounded-r-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        formErrors.phone ? 'border-red-400 bg-red-50/20' : 'border-stone-300'
                      }`}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {formErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* City and Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700">Ville de rattachement</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={selectedCountry.defaultCity}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-stone-500" />
                    Adresse Email (optionnel)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@exemple.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              {/* ROLE SPECIFIC SECTION */}
              {selectedRole === 'MANAGER' ? (
                /* Manager Section: Plan, Commission, Payout */
                <div className="space-y-5 pt-4 border-t border-stone-200">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-600" />
                        3. Plan d'abonnement & Plafond de commission
                      </label>
                      <span className="text-[11px] text-stone-500">
                        Plafonds configurés dans la BDD
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Sélectionnez le forfait souscrit par ce gestionnaire. Chaque plan fixe la commission maximale autorisée par tour de tontine.
                    </p>
                  </div>

                  {/* 4 Plan selector cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {plans.map((plan) => {
                      const rate = currentRates[plan.code] ?? plan.maxCommissionRate;
                      const isSelected = selectedPlanCode === plan.code;
                      return (
                        <div
                          key={plan.code}
                          onClick={() => handleSelectPlan(plan.code)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all text-left flex flex-col justify-between ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-2 ring-amber-500/20'
                              : 'border-stone-200 hover:border-stone-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-stone-900">{plan.name}</span>
                              {plan.popular && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500 text-stone-950">
                                  Top
                                </span>
                              )}
                            </div>
                            <div className="text-base font-extrabold text-stone-900 mt-1">
                              {plan.monthlyPrice === 0 ? 'Gratuit' : formatXOF(plan.monthlyPrice)}
                              {plan.monthlyPrice > 0 && (
                                <span className="text-[10px] font-normal text-stone-500"> /mois</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-stone-200/70 text-[11px] space-y-1">
                            <div className="flex items-center justify-between font-medium">
                              <span className="text-stone-600">Commission :</span>
                              <span className="font-bold text-amber-700">{formatPercent(rate)}</span>
                            </div>
                            <div className="text-[10px] text-stone-500">
                              {plan.maxTontines === null ? 'Tontines illimitées' : `${plan.maxTontines} tontine max`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Commission applied details */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-stone-900">
                          Taux de commission appliqué aux tontines créées
                        </span>
                        <p className="text-[11px] text-stone-500">
                          Plafond strict du plan {selectedPlanCode} : {formatPercent(currentRates[selectedPlanCode])}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-amber-700 font-mono">
                          {formatPercent(managerCommissionRate)}
                        </span>
                        <span className="text-[10px] text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                          {(managerCommissionRate).toFixed(4)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        id="enable-commissions"
                        checked={commissionEnabled}
                        onChange={(e) => setCommissionEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                      />
                      <label htmlFor="enable-commissions" className="text-stone-700 select-none">
                        Activer automatiquement la retenue des commissions dans le Grand Livre
                      </label>
                    </div>
                  </div>

                  {/* Payout Wallet */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-stone-600" />
                      4. Compte de Versement des Commissions (Portefeuille)
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-stone-700">Moyen de reversement</label>
                        <select
                          value={payoutProvider}
                          onChange={(e) => setPayoutProvider(e.target.value as any)}
                          className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        >
                          <option value="WAVE">Wave Mobile Money (Recommandé - 0% ou 1%)</option>
                          <option value="ORANGE_MONEY">Orange Money</option>
                          <option value="MTN_MOMO">MTN Mobile Money</option>
                          <option value="BANK_TRANSFER">Virement Bancaire (RIB / IBAN)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-stone-700">
                          Numéro de compte / Portefeuille de retrait
                        </label>
                        <input
                          type="text"
                          value={payoutAccount}
                          onChange={(e) => setPayoutAccount(e.target.value)}
                          placeholder="Ex: +225 07 88 14 23 90 ou IBAN CI06..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Member Section: Payment Method, Invitation code, CNI */
                <div className="space-y-5 pt-4 border-t border-stone-200">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      3. Préférences de Cotisation & Tontines
                    </label>
                    <p className="text-xs text-stone-500 mt-1">
                      Configurez le compte de débit mobile money pour le versement automatique des cotisations.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-700">
                        Opérateur Mobile Money principal
                      </label>
                      <select
                        value={memberPaymentMethod}
                        onChange={(e) => setMemberPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      >
                        <option value="WAVE">Wave (Instantané & sans frais cachés)</option>
                        <option value="ORANGE_MONEY">Orange Money</option>
                        <option value="MTN_MOMO">MTN Mobile Money</option>
                        <option value="MOOV_MONEY">Moov Money / Flooz</option>
                        <option value="CASH">Espèces / Versement direct au gestionnaire</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-700">
                        Code d'invitation à une tontine (optionnel)
                      </label>
                      <input
                        type="text"
                        value={tontineInvitationCode}
                        onChange={(e) => setTontineInvitationCode(e.target.value.toUpperCase())}
                        placeholder="Ex: TERANGA-2025, ADJAME-VIP..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700">
                      Numéro de Pièce d'Identité / CNI (KYC optionnel)
                    </label>
                    <input
                      type="text"
                      value={identityNumber}
                      onChange={(e) => setIdentityNumber(e.target.value)}
                      placeholder="Ex: CNI SN-1988-1204 ou CI-00293810"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>
              )}

              {/* Password Section */}
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-stone-600" />
                  {selectedRole === 'MANAGER' ? '5. Sécurité du Compte' : '4. Sécurité & Accès'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700">
                      Mot de passe / Code d'accès
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        formErrors.password ? 'border-red-400 bg-red-50/20' : 'border-stone-300'
                      }`}
                    />
                    {formErrors.password && (
                      <p className="text-[11px] text-red-600">{formErrors.password}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        formErrors.confirmPassword ? 'border-red-400 bg-red-50/20' : 'border-stone-300'
                      }`}
                    />
                    {formErrors.confirmPassword && (
                      <p className="text-[11px] text-red-600">{formErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms of Use & Platform Trust Policy Acceptance */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    {selectedRole === 'MANAGER' ? '6. Politique d\'Utilisation & Charte de Gestion' : '5. Politique d\'Utilisation & Engagement'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Lire le document intégral</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Key commitments summary box based on selected role */}
                <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                  selectedRole === 'MANAGER'
                    ? 'bg-amber-50/60 border-amber-200/90 text-amber-950'
                    : 'bg-emerald-50/60 border-emerald-200/90 text-emerald-950'
                }`}>
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    {selectedRole === 'MANAGER' ? (
                      <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <Users className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                    <span>
                      {selectedRole === 'MANAGER'
                        ? 'Vos engagements contractuels en tant que Gestionnaire de Tontine :'
                        : 'Vos engagements contractuels en tant que Membre Cotisant :'}
                    </span>
                  </div>

                  <ul className="space-y-1 text-[11px] leading-relaxed">
                    {selectedRole === 'MANAGER' ? (
                      <>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Plafond de commission strict : maximum <strong>{formatPercent(currentRates[selectedPlanCode])}</strong> (Plan {selectedPlanCode}). Aucune retenue occulte.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Reversement sous <strong>24h ouvrées</strong> de la cagnotte intégrale au membre bénéficiaire dès réception des cotisations.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>Interdiction formelle de spéculation ou d'utilisation personnelle des fonds. Enregistrement systématique au Grand Livre d'audit.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Liberté de participation</strong> : vous n'êtes pas tenu de cotiser ni de participer aux cagnottes pour créer et administrer vos cercles.</span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>Engagement irrévocable de paiement ponctuel</strong> à chaque échéance jusqu'au terme de la rotation, y compris après avoir reçu ma cagnotte.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Maintien d'un solde Mobile Money ({memberPaymentMethod}) suffisant et actif aux dates prévues de prélèvement.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Conformité avec la vérification d'identité (KYC) selon les plafonds réglementaires BCEAO / UEMOA.</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="accept-terms-checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        if (e.target.checked && formErrors.terms) {
                          setFormErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.terms;
                            return copy;
                          });
                        }
                      }}
                      className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                    />
                    <div className="text-xs text-stone-700 leading-normal">
                      <span>
                        J'ai lu et j'accepte expressément la{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowTermsModal(true);
                          }}
                          className="font-bold text-emerald-700 underline hover:text-emerald-800"
                        >
                          Politique d'Utilisation & Charte de Confiance TONTINE
                        </button>
                        {selectedRole === 'MANAGER'
                          ? ' en tant que Gestionnaire (responsabilité fiduciaire, plafonds et reversement rapide).'
                          : ' en tant que Membre (solidarité financière et obligation de cotisation jusqu\'au terme du cycle).'}
                      </span>
                    </div>
                  </label>
                  {formErrors.terms && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1.5 ml-7 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.terms}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setShowCodePreview(!showCodePreview)}
                  className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5"
                >
                  <Code2 className="w-4 h-4 text-amber-600" />
                  {showCodePreview ? 'Masquer le script Prisma ORM' : 'Voir le code Prisma généré'}
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  {selectedRole === 'MANAGER'
                    ? "Finaliser l'inscription du Gestionnaire"
                    : "Finaliser l'inscription du Membre"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Sidebar: Summary, Schema info & Prisma code preview */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Registration Card Summary */}
            <div className="bg-stone-900 text-white p-6 rounded-2xl border border-stone-800 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Aperçu du Compte
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {selectedRole === 'MANAGER' ? 'ROLE_MANAGER' : 'ROLE_MEMBER'}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white">
                  {firstName.trim() || lastName.trim()
                    ? `${firstName.trim()} ${lastName.trim()}`
                    : 'Nouvel Utilisateur'}
                </h4>
                {selectedRole === 'MANAGER' && (
                  <p className="text-xs text-amber-400 font-medium">
                    {businessName.trim() || 'Organisation / Tontine'}
                  </p>
                )}
                <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                  <span>{selectedCountry.flag}</span>
                  <span>{city || selectedCountry.defaultCity}, {selectedCountry.name}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-800/80 border border-stone-700/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-stone-300">
                  <span className="text-stone-400">Téléphone :</span>
                  <span className="font-mono text-white">
                    {phone.trim() ? (phone.startsWith('+') ? phone : `${selectedCountry.dialCode} ${phone}`) : '—'}
                  </span>
                </div>

                {selectedRole === 'MANAGER' ? (
                  <>
                    <div className="flex items-center justify-between text-stone-300">
                      <span className="text-stone-400">Abonnement :</span>
                      <span className="font-bold text-white">Plan {selectedPlanCode}</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-300">
                      <span className="text-stone-400">Taux Commission :</span>
                      <span className="font-black text-amber-400 font-mono">
                        {formatPercent(managerCommissionRate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-stone-300">
                      <span className="text-stone-400">Paiement :</span>
                      <span className="text-white">{payoutProvider}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-stone-300">
                      <span className="text-stone-400">Paiement Mobile :</span>
                      <span className="font-bold text-emerald-400">{memberPaymentMethod}</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-300">
                      <span className="text-stone-400">Invitation :</span>
                      <span className="font-mono text-white">
                        {tontineInvitationCode.trim() || 'Libre'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-[11px] text-stone-400 leading-relaxed border-t border-stone-800 pt-3">
                {selectedRole === 'MANAGER'
                  ? `Ce gestionnaire sera habilité à retenir jusqu'à ${formatPercent(
                      managerCommissionRate
                    )} sur chaque cotisation collectée dans ses tontines.`
                  : 'Ce membre pourra participer aux tontines et recevra ses paiements directement sur son compte Mobile Money.'}
              </div>
            </div>

            {/* Prisma ORM Transaction Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-stone-900">Requête Prisma Client (ORM)</h4>
                </div>
                <button
                  onClick={copySnippet}
                  className="px-2 py-1 rounded text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {copiedCode ? 'Copié !' : 'Copier'}
                </button>
              </div>

              <div className="rounded-xl bg-stone-950 p-3.5 font-mono text-[11px] text-stone-300 overflow-x-auto max-h-80 border border-stone-800 leading-snug">
                <pre>{prismaSnippet}</pre>
              </div>

              <p className="text-[10px] text-stone-500 leading-normal">
                Modèles mis en jeu : <code className="text-stone-800 font-bold">User</code>,{' '}
                <code className="text-stone-800 font-bold">UserRole</code>,{' '}
                {selectedRole === 'MANAGER' ? (
                  <>
                    <code className="text-stone-800 font-bold">Manager</code>,{' '}
                    <code className="text-stone-800 font-bold">Subscription</code>,{' '}
                    <code className="text-stone-800 font-bold">Wallet</code>
                  </>
                ) : (
                  <code className="text-stone-800 font-bold">TontineMember</code>
                )}
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: REGISTERED ACCOUNTS DIRECTORY */}
      {viewMode === 'directory' && (
        <div className="space-y-6">
          {/* Filters & Search Header */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, téléphone, structure..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>

            {/* Role Filter Chips */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  roleFilter === 'ALL'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Tous ({users.length})
              </button>
              <button
                onClick={() => setRoleFilter('MANAGER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  roleFilter === 'MANAGER'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Gestionnaires ({managersCount})
              </button>
              <button
                onClick={() => setRoleFilter('MEMBER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  roleFilter === 'MEMBER'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Membres Cotisants ({membersCount})
              </button>
            </div>
          </div>

          {/* Users List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUsers.map((user) => {
              const isManager = user.role === 'MANAGER';
              const country = SUPPORTED_COUNTRIES.find((c) => c.code === user.countryCode) || SUPPORTED_COUNTRIES[0];

              return (
                <div
                  key={user.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Top Row: Role Badge + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isManager
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {isManager ? (
                          <>
                            <Briefcase className="w-3 h-3" /> Gestionnaire
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3" /> Membre Cotisant
                          </>
                        )}
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {user.status === 'ACTIVE' ? 'Actif' : 'En attente'}
                      </span>
                    </div>

                    {/* Name & Business */}
                    <div className="mt-3">
                      <h3 className="font-bold text-stone-900 text-base">
                        {user.firstName} {user.lastName}
                      </h3>
                      {isManager && user.managerDetails && (
                        <p className="text-xs font-semibold text-amber-800 mt-0.5">
                          {user.managerDetails.businessName}
                        </p>
                      )}
                      <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
                        <span>{country.flag}</span>
                        <span>
                          {user.city || country.defaultCity}, {country.name}
                        </span>
                      </p>
                    </div>

                    {/* Contact info strip */}
                    <div className="mt-3.5 pt-3 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400">Téléphone :</span>
                        <span className="font-mono font-medium text-stone-900">{user.phone}</span>
                      </div>
                      {user.email && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Email :</span>
                          <span className="truncate max-w-[180px] text-stone-700">{user.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Specific Details Box */}
                    {isManager && user.managerDetails && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 font-medium">Plan d'abonnement :</span>
                          <span className="font-bold text-stone-900">
                            {user.managerDetails.planCode}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 font-medium">Commission retenue :</span>
                          <span className="font-black text-amber-700 font-mono">
                            {formatPercent(user.managerDetails.commissionRate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 font-medium">Reversement :</span>
                          <span className="text-stone-800">{user.managerDetails.payoutProvider}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-amber-200/50">
                          <span className="text-stone-600 font-medium">Solde portefeuille :</span>
                          <span className="font-bold text-stone-900 font-mono">
                            {formatXOF(user.managerDetails.walletBalance)}
                          </span>
                        </div>
                      </div>
                    )}

                    {!isManager && user.memberDetails && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 font-medium">Mode de paiement :</span>
                          <span className="font-bold text-emerald-900">
                            {user.memberDetails.paymentMethod}
                          </span>
                        </div>
                        {user.memberDetails.tontineInvitationCode && (
                          <div className="flex items-center justify-between">
                            <span className="text-stone-600 font-medium">Tontine affiliée :</span>
                            <span className="font-mono text-stone-800 font-semibold">
                              {user.memberDetails.tontineInvitationCode}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 font-medium">Tontines actives :</span>
                          <span className="font-bold text-stone-900">
                            {user.memberDetails.joinedTontinesCount}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2 text-xs">
                    {onLoginAsUser ? (
                      <button
                        onClick={() => onLoginAsUser(user)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                          isManager
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Ouvrir Dashboard
                      </button>
                    ) : (
                      <span className="text-[10px] text-stone-400 font-mono">ID: {user.id}</span>
                    )}

                    {isManager && onSelectManagerForSimulation && user.managerDetails && (
                      <button
                        onClick={() => onSelectManagerForSimulation(user.managerDetails!.planCode)}
                        className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 hover:underline text-[11px]"
                      >
                        Simuler tontine
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-8">
              <Users className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-stone-800">Aucun compte ne correspond à votre recherche</p>
              <p className="text-xs text-stone-500 mt-1">
                Modifiez vos critères de recherche ou ajoutez un nouveau compte via l'onglet d'inscription.
              </p>
              <button
                onClick={() => setViewMode('form')}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
              >
                Inscrire un compte
              </button>
            </div>
          )}
        </div>
      )}

      {/* Interactive Terms & Policy Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setTermsAccepted(true);
          setFormErrors((prev) => {
            const copy = { ...prev };
            delete copy.terms;
            return copy;
          });
        }}
        highlightRole={selectedRole}
        alreadyAccepted={termsAccepted}
      />
    </div>
  );
}

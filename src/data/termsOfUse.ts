export interface TermsSection {
  id: string;
  title: string;
  iconName: string;
  audience: 'ALL' | 'MANAGER' | 'MEMBER';
  summary: string;
  articles: {
    num: string;
    title: string;
    content: string;
    bulletPoints?: string[];
  }[];
}

export const TONTINE_TERMS_METADATA = {
  title: "Politique d'Utilisation & Charte de Confiance TONTINE",
  version: "1.2 (Septembre 2026)",
  regulatoryFramework: "Conforme aux Directives BCEAO / UEMOA sur la Monnaie Électronique et au Droit Commercial Général OHADA",
  effectiveDate: "1er Janvier 2026",
  shortDisclaimer: "L'adhésion à la plateforme TONTINE emporte acceptation pleine et entière des droits et devoirs réciproques des Gestionnaires et des Membres cotisants.",
};

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'preamble',
    title: '1. Préambule & Rôle de la Plateforme TONTINE',
    iconName: 'ShieldCheck',
    audience: 'ALL',
    summary: "Définition du service technologique TONTINE en tant que tiers de confiance pour l'épargne rotative en zone UEMOA.",
    articles: [
      {
        num: 'Article 1.1',
        title: 'Nature du Service',
        content: "TONTINE est une plateforme technologique sécurisée d'administration, de traçabilité et d'automatisation des tontines rotatives traditionnelles (Djangui, Pari, Esusu, Susu). La plateforme agit en qualité de tiers facilitateur et fournit le grand livre comptable, les alertes de paiement et les protocoles d'intégration Mobile Money (Wave, Orange Money, MTN MoMo, Moov Money).",
      },
      {
        num: 'Article 1.2',
        title: 'Engagement de Loyauté et Bonne Foi',
        content: "Chaque utilisateur (qu'il agisse en qualité de Gestionnaire ou de Membre cotisant) s'engage à faire preuve d'une parfaite bonne foi, de transparence et de respect mutuel au sein des cercles d'épargne auxquels il prend part.",
      },
    ],
  },
  {
    id: 'managers',
    title: '2. Charte & Obligations des Gestionnaires (Managers)',
    iconName: 'Briefcase',
    audience: 'MANAGER',
    summary: "Responsabilités administratives, respect des plafonds de commissions, versement ponctuel des cagnottes et interdiction formelle de spéculation.",
    articles: [
      {
        num: 'Article 2.1',
        title: 'Plafond et Transparence des Commissions',
        content: "Le Gestionnaire s'engage à appliquer uniquement les taux de commission strictement autorisés par son forfait souscrit (Starter: max 2.5%, Premium: max 3.0%, Business: max 3.5%). Toute retenue occulte, frais caché ou prélèvement arbitraire non déclaré dans le règlement initial de la tontine est formellement prohibé et constitue un motif de révocation immédiate.",
        bulletPoints: [
          "Affichage obligatoire du taux de commission à chaque membre avant son intégration.",
          "Enregistrement automatique de chaque retenue dans le Grand Livre d'audit comptable.",
          "Interdiction de modifier le taux de commission d'une tontine en cours de cycle.",
        ],
      },
      {
        num: 'Article 2.2',
        title: 'Délais de Décaissement de la Cagnotte au Bénéficiaire',
        content: "Le Gestionnaire a l'obligation stricte de verser l'intégralité de la cagnotte nette (montant total collecté déduction faite de la commission convenue) au membre bénéficiaire du tour actif sous un délai maximal de 24 heures ouvrées après clôture de la période de cotisation.",
      },
      {
        num: 'Article 2.3',
        title: 'Ségrégation des Fonds et Interdiction de Détournement',
        content: "Les fonds collectés auprès des cotisants constituent un patrimoine d'affectation temporaire exclusivement destiné aux bénéficiaires de la tontine. Il est formellement interdit au Gestionnaire d'utiliser ces fonds à des fins personnelles, de spéculation ou d'avance de trésorerie étrangère au groupe.",
      },
      {
        num: 'Article 2.4',
        title: 'Vérification et Modération des Membres',
        content: "Le Gestionnaire est tenu d'exercer une diligence raisonnable en vérifiant l'identité et les coordonnées des participants qu'il admet dans son groupe, veillant à ce que chaque membre dispose d'un moyen de paiement actif et vérifié.",
      },
      {
        num: 'Article 2.5',
        title: 'Faculté de Non-Participation du Gestionnaire aux Cagnottes et Cotisations',
        content: "Le Gestionnaire n'est pas tenu de participer à la tontine en tant que cotisant. Il a la faculté absolue de créer, configurer et administrer la tontine à titre de superviseur indépendant sans être tenu de cotiser ni de percevoir de cagnotte. Son rôle consiste alors à garantir la ponctualité des tours, ordonner le versement net aux membres bénéficiaires et percevoir sa commission réglementée. S'il choisit volontairement de participer en qualité de membre cotisant, il est assujetti aux mêmes devoirs de paiement régulier que tout autre participant.",
        bulletPoints: [
          "Le Gestionnaire peut administrer une ou plusieurs tontines sans aucune obligation d'y cotiser.",
          "Les cagnottes sont réservées aux membres cotisants du groupe.",
          "La commission du Gestionnaire est automatiquement calculée et prélevée sur le total collecté lors de chaque tour, que le gestionnaire participe ou non comme cotisant.",
        ],
      },
      {
        num: 'Article 2.6',
        title: 'Liberté de Fixation du Montant de la Cotisation par le Gestionnaire',
        content: "Le Gestionnaire fixe souverainement le montant unitaire de la cotisation périodique (ex: 5 000 F, 25 000 F, 50 000 F, 100 000 F CFA ou tout montant personnalisé adapté aux capacités de sa communauté) lors de la création ou de la configuration du cercle. Ce montant est contractuel pour l'ensemble des membres du groupe et sert de base exclusive au calcul des cagnottes brutes et des commissions réglementées.",
        bulletPoints: [
          "Le Gestionnaire peut choisir parmi des paliers usuels ou saisir un montant sur mesure selon les objectifs du groupe d'épargne.",
          "Toute modification du montant de la cotisation effectuée par le Gestionnaire est enregistrée dans le système et notifiée aux participants.",
        ],
      },
    ],
  },
  {
    id: 'members',
    title: '3. Charte & Obligations des Membres Cotisants',
    iconName: 'Users',
    audience: 'MEMBER',
    summary: "Obligation irrévocable de paiement des cotisations à date échue, maintien du solde et solidarité du cycle complet.",
    articles: [
      {
        num: 'Article 3.1',
        title: 'Engagement Irrévocable de Cotisation Complète',
        content: "L'adhésion d'un membre à un groupe de tontine vaut engagement contractuel irrévocable de s'acquitter de la totalité des cotisations prévues jusqu'au terme complet de la rotation, y compris et expressément après avoir déjà perçu sa propre cagnotte lors d'un tour antérieur.",
        bulletPoints: [
          "Paiement obligatoire à chaque date d'échéance fixée par le calendrier du groupe.",
          "Interdiction d'abandonner le groupe ou de cesser ses paiements après avoir été bénéficiaire.",
          "Maintien impératif d'un solde suffisant sur son compte Mobile Money (Wave, Orange, MTN, Moov) aux dates d'échéance.",
        ],
      },
      {
        num: 'Article 3.2',
        title: 'Exactitude des Données et Numéros de Téléphone',
        content: "Le membre doit obligatoirement fournir un numéro de téléphone Mobile Money enregistré à son nom exact correspondant à sa pièce d'identité officielle. Tout rejet de paiement consécutif à un compte bloqué ou erroné relève de la seule responsabilité du membre défaillant.",
      },
      {
        num: 'Article 3.3',
        title: 'Régularisation Immédiate en Cas d\'Incident',
        content: "En cas d'échec de prélèvement ou de retard de cotisation, le membre bénéficie d'un délai de grâce de 48 heures maximum pour régulariser sa situation directement auprès du gestionnaire, sous peine de déclenchement des procédures pour défaut de paiement.",
      },
    ],
  },
  {
    id: 'security_kyc',
    title: '4. Conformité KYC, Plafonds UEMOA & Sécurité des Données',
    iconName: 'Lock',
    audience: 'ALL',
    summary: "Respect des exigences de lutte contre le blanchiment (BCEAO), transmission des pièces officielles et protection des données privées.",
    articles: [
      {
        num: 'Article 4.1',
        title: 'Obligation de Vérification d\'Identité (KYC)',
        content: "Afin de garantir la sécurité mutuelle de la communauté et de respecter les instructions de la Banque Centrale des États de l'Afrique de l'Ouest (BCEAO), chaque participant est tenu de justifier de son identité :",
        bulletPoints: [
          "Niveau 1 : Numéro de téléphone vérifié par OTP (Plafond : 200 000 F CFA / mois).",
          "Niveau 2 : Pièce d'identité officielle valide CNI ou Passeport biométrique (Plafond : 2 000 000 F CFA / mois).",
          "Niveau 3 : Biométrie faciale et justificatif de résidence (Plafond Pro : jusqu'à 10 000 000 F CFA / mois).",
        ],
      },
      {
        num: 'Article 4.2',
        title: 'Chiffrement et Confidentialité des Pièces Transmises',
        content: "Les documents d'identité téléversés sont protégés par un chiffrement de niveau bancaire AES-256. Ils ne sont en aucun cas vendus, cédés ou partagés aux autres membres du groupe. Seul le badge de conformité certifié est visible publiquement pour témoigner de la crédibilité de l'utilisateur.",
      },
    ],
  },
  {
    id: 'disputes',
    title: '5. Gestion des Impayés, Sanctions & Juridiction Compétente',
    iconName: 'AlertTriangle',
    audience: 'ALL',
    summary: "Procédures en cas de manquement, gel de compte, signalement aux autorités et droit applicable OHADA.",
    articles: [
      {
        num: 'Article 5.1',
        title: 'Mesures Conservatoires en Cas de Fraude ou de Défaut',
        content: "Tout refus délibéré de cotisation après encaissement de la cagnotte, ou toute tentative de détournement par un gestionnaire, entraîne cumulativement :",
        bulletPoints: [
          "La suspension immédiate du compte et le blocage de tout nouveau retrait.",
          "L'inscription sur le registre de vigilance des impayés partagé entre gestionnaires partenaires.",
          "La transmission du dossier complet certifié par horodatage numérique (logs, contrats, identité) aux conseils juridiques et autorités judiciaires compétentes.",
        ],
      },
      {
        num: 'Article 5.2',
        title: 'Droit Applicable et Résolution des Litiges',
        content: "La présente Politique est régie par les règles du droit commercial général de l'OHADA et par la législation applicable dans l'État membre de l'UEMOA où l'infraction est constatée. Les parties s'engagent à privilégier la médiation préalable auprès de la plateforme TONTINE.",
      },
    ],
  },
];

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "fr";

const STORAGE_KEY = "sc_lang";

export type Messages = {
  brand: string;
  place: string;
  demoOrg: string;
  sealedNote: string;
  flags: string;
  onFile: string;
  asked: string;
  oob: string;
  reviewed: string;
  approve: string;
  away: string;
  loaded: string;
  rolling: string;
  arrived: string;
  delayed: string;
  warning: string;
  matches: string;
  notGov: string;
  jevNote: string;
  empty: string;
  dual: string;
  signIn: string;
  signOut: string;
  createPasskey: string;
  supplier: string;
  manager: string;
  driver: string;
  receiver: string;
  admin: string;
  directory: string;
  scenarios: string;
  sendToManager: string;
  reviewBytes: string;
  passkeyStopped: string;
  whoSpoke: string;
  back: string;
  open: string;
  details: string;
  carrier: string;
  setpoint: string;
  loads: string;
  incoming: string;
  pod: string;
  partnerCheck: string;
  dualControl: string;
  print: string;
  copy: string;
  copied: string;
  skipToContent: string;
  statusDraft: string;
  statusFlagged: string;
  statusOob: string;
  statusPending: string;
  statusSecond: string;
  statusApproved: string;
  statusRejected: string;
  statusRevoked: string;
  scheduled: string;
  alerts: string;
  holdCall: string;
  notApproval: string;
  signedInAs: string;
  noSession: string;
  signInWithPasskey: string;
  username: string;
  usernamePlaceholder: string;
  team: string;
  teamHint: string;
  addTeammate: string;
  addTeammateHint: string;
  teammateAdded: string;
  fullName: string;
  role: string;
  encryption: string;
  keysReady: string;
  noKeys: string;
  passkeys: string;
  noCredentials: string;
  revoke: string;
  revokeConfirm: string;
  synced: string;
  enrollmentCode: string;
  enrollmentCodeHint: string;
  codeIssued: string;
  issueCode: string;
  createOrg: string;
  newOrgHint: string;
  orgName: string;
  province: string;
  yourName: string;
  orgCreated: string;
  orgLabel: string;
  orgPlaceholder: string;
  accountHint: string;
  identityRequired: string;
  requests: string;
  who: string;
  type: string;
  status: string;
  hash: string;
  load: string;
  goods: string;
  dock: string;
  seal: string;
  eta: string;
  company: string;
  city: string;
  domain: string;
  numberOnFile: string;
  scenariosHint: string;
  sealedNoteHint: string;
  loadsHint: string;
  incomingHint: string;
  podHint: string;
  podSaved: string;
  pickLoad: string;
  liveLocation: string;
  liveLocationHint: string;
  noLive: string;
  lastKnown: string;
  simulated: string;
  startTrip: string;
  stopTrip: string;
  noLoads: string;
  noLoadsHint: string;
  messages: string;
  messagesHint: string;
  noMessages: string;
  messagePlaceholder: string;
  send: string;
  sending: string;
  lockedMessage: string;
  noDevices: string;
  thisDevice: string;
  resetKeys: string;
  resetKeysConfirm: string;
  safetyNumber: string;
  keyChanged: string;
  documents: string;
  documentsHint: string;
  uploading: string;
  toastSent: string;
  toastDocSaved: string;
  toastTrip: string;
  toastTripStopped: string;
  directoryHint: string;
  emptyManager: string;
  emptyCase: string;
  confirmBytes: string;
  signedSoFar: string;
  nobody: string;
  openPartnerPage: string;
  bytesLocked: string;
  bytesLockedBody: string;
  userVerification: string;
  yes: string;
  no: string;
  noPartnerPage: string;
  noPartnerPageBody: string;
  oobHint: string;
  backToBoard: string;
  noRequestOpen: string;
  pickFromBoard: string;
  serverDown: string;
  serverDownBody: string;
  passkeyCreated: string;
  creatingPasskey: string;
  signingIn: string;
  counterpartySearch: string;
  noCounterparty: string;
  onFileCount: string;
  pickCounterparty: string;
  noteInOwnWords: string;
  sealPending: string;
  sealed: string;
  sealHint: string;
  phoneOnlyTitle: string;
  phoneOnlyBody: string;
  submitted: string;
  submittedBody: string;
  emptyDirectory: string;
  emptyDirectorySupplier: string;
  emptyDirectoryManager: string;
  addContact: string;
  addContactHint: string;
  contactName: string;
  bankOnFileOptional: string;
  institution: string;
  transit: string;
  account: string;
  contactAdded: string;
  caseLabel: string;
  checkingHash: string;
  hashVerified: string;
  hashMismatch: string;
  hashMismatchBody: string;
  canonicalPayload: string;
  approvalProgress: string;
  twoManagers: string;
  ceremonyHint: string;
  jevTitle: string;
  waitingPasskey: string;
  approvalRecorded: string;
  secondSignerNeeded: string;
  revokeCase: string;
  revokeCaseConfirm: string;
  cancel: string;
  dismiss: string;
  statusSent: string;
  saveFailed: string;
};

const en: Messages = {
  brand: "SupplyChek",
  place: "A platform for food-chain organizations",
  demoOrg: "Demo organization: Lake Ontario Cold Storage",
  sealedNote: "Write a sealed note",
  flags: "Flags",
  onFile: "On file",
  asked: "Asked for",
  oob: "Call the number on file",
  reviewed: "I reviewed these bytes",
  approve: "Approve with passkey",
  away: "15 minutes away",
  loaded: "Loaded",
  rolling: "Rolling",
  arrived: "Arrived",
  delayed: "Delayed",
  warning: "Driver is 15 minutes away",
  matches: "Matches uploaded content",
  notGov: "SupplyChek attestation — not a government certification",
  jevNote: "Jev labeled this text. It did not approve it.",
  empty: "Nothing here yet.",
  dual: "Two different people must each use a passkey.",
  signIn: "Sign in",
  signOut: "Sign out",
  createPasskey: "Create passkey",
  supplier: "Supplier",
  manager: "Manager",
  driver: "Driver",
  receiver: "Receiver",
  admin: "Admin",
  directory: "Directory",
  scenarios: "Scenarios",
  sendToManager: "Send to the manager desk",
  reviewBytes: "Review the bytes",
  passkeyStopped: "Passkey stopped",
  whoSpoke: "Who you spoke with, and when",
  back: "Back",
  open: "Open",
  details: "Details",
  carrier: "Carrier",
  setpoint: "Setpoint",
  loads: "Loads",
  incoming: "Incoming",
  pod: "Proof of delivery",
  partnerCheck: "Partner check",
  dualControl: "Dual control",
  print: "Print",
  copy: "Copy",
  copied: "Copied",
  skipToContent: "Skip to content",
  statusDraft: "Draft",
  statusFlagged: "Flagged",
  statusOob: "Waiting for call",
  statusPending: "Ready to review",
  statusSecond: "Needs second approval",
  statusApproved: "Approved",
  statusRejected: "Rejected",
  statusRevoked: "Revoked",
  scheduled: "Scheduled",
  alerts: "alerts",
  holdCall: "Approve stays off until every step is checked and you name who you called.",
  notApproval: "Uploading a photo does not approve a change.",
  signedInAs: "Signed in as",
  noSession: "No active session. Sign in with a passkey tied to one account.",
  signInWithPasskey: "Sign in with passkey",
  username: "Username",
  usernamePlaceholder: "First name, lower case",
  team: "Team",
  teamHint: "Everyone in your organization. Keys show who finished encryption setup.",
  addTeammate: "Add teammate",
  addTeammateHint: "They sign in with this username and your organization, then create their passkey.",
  teammateAdded: "Teammate added:",
  fullName: "Name",
  role: "Role",
  encryption: "Encryption",
  keysReady: "keys ready",
  noKeys: "no keys",
  passkeys: "Passkeys",
  noCredentials: "No passkeys on file. They enroll from the sign-in screen.",
  revoke: "Revoke",
  revokeConfirm: "Remove this passkey? They re-enroll from the sign-in screen.",
  synced: "synced",
  enrollmentCode: "Enrollment code",
  enrollmentCodeHint: "From your admin, for first-time setup",
  codeIssued: "Code issued once — read it to them, it never shows again:",
  issueCode: "Issue code",
  createOrg: "Create organization",
  newOrgHint: "Start a new organization. You become its admin.",
  orgName: "Organization name",
  province: "Province",
  yourName: "Your name",
  orgCreated: "Organization ready. Sign in below with your username, then create your passkey.",
  orgLabel: "Organization",
  orgPlaceholder: "Organization name or slug",
  accountHint: "Enter your own username and organization. Accounts are not listed here.",
  identityRequired: "Enter your username and organization first.",
  requests: "Requests",
  who: "Who",
  type: "Type",
  status: "Status",
  hash: "Hash",
  load: "Load",
  goods: "Goods",
  dock: "Dock",
  seal: "Seal",
  eta: "ETA",
  company: "Company",
  city: "City",
  domain: "Domain",
  numberOnFile: "Number on file",
  scenariosHint: "Five sealed-thread drills from the demo pack, plus a mid-haul change.",
  sealedNoteHint: "Write the change here for the verified counterparty. Never paste email text. The note seals to a hash at send.",
  loadsHint: "Approved dock and seal stay on the board until a new ceremony changes them.",
  incomingHint:
    "You see the dock on the board. A destination change does not move it until it is fully approved.",
  podHint: "A photo stays with its own hash.",
  podSaved: "Photo saved with its hash.",
  pickLoad: "Pick a load",
  liveLocation: "Live location",
  liveLocationHint: "Driver positions update every few seconds while a trip runs.",
  noLive: "No driver is sharing a live position right now.",
  lastKnown: "Last known",
  simulated: "simulated",
  startTrip: "Share my location",
  stopTrip: "Stop sharing",
  noLoads: "No loads assigned",
  noLoadsHint: "Dispatch assigns loads to your username. Nothing is assigned yet.",
  messages: "Messages",
  messagesHint: "End-to-end encrypted with the Signal protocol. The server only sees ciphertext.",
  noMessages: "No messages yet. Say what changed.",
  messagePlaceholder: "Write to the people on this case…",
  send: "Send",
  sending: "Sending…",
  lockedMessage: "Locked. Your device cannot open this message.",
  noDevices: "Nobody on this case finished encryption setup yet.",
  thisDevice: "This device",
  resetKeys: "Reset encryption",
  resetKeysConfirm: "Replace this device's keys? Messages sent to the old keys stay locked.",
  safetyNumber: "Safety number",
  keyChanged: "key changed",
  documents: "Documents",
  documentsHint: "Files are hash-recorded. Anyone can re-check the hash later.",
  uploading: "Uploading…",
  toastSent: "Message sent sealed.",
  toastDocSaved: "Document saved with its hash.",
  toastTrip: "Live trip running. The receiver sees you move.",
  toastTripStopped: "Stopped sharing position.",
  directoryHint: "Numbers already on file. Do not use a number that arrives inside a request.",
  emptyManager: "Write a sealed note on the supplier desk.",
  emptyCase: "Pick one from the manager desk.",
  confirmBytes: "Confirm these bytes",
  signedSoFar: "Signed so far",
  nobody: "nobody",
  openPartnerPage: "Open partner page",
  bytesLocked: "Bytes locked",
  bytesLockedBody:
    "The passkey step required user verification. The partner page shows who signed and when.",
  userVerification: "User verification",
  yes: "Yes",
  no: "No",
  noPartnerPage: "No partner page yet",
  noPartnerPageBody: "A page appears after the required passkeys sign the same hash.",
  oobHint: "Approve stays off until every step is checked and you name who you called.",
  backToBoard: "Back to board",
  noRequestOpen: "No request open",
  pickFromBoard: "Pick one from the manager desk.",
  serverDown: "Server not reachable",
  serverDownBody: "Start the Next server on port 3000. Passkeys need the API. There is no pretend login.",
  passkeyCreated: "Passkey created for this account.",
  creatingPasskey: "Creating passkey…",
  signingIn: "Signing in…",
  counterpartySearch: "Search counterparty by name, domain, city…",
  noCounterparty: "No counterparty matches.",
  onFileCount: "on file",
  pickCounterparty: "Pick a counterparty",
  noteInOwnWords: "Describe the change in your own words. Do not paste email or links.",
  sealPending: "seal pending",
  sealed: "sealed",
  sealHint: "The hash locks at send. Managers verify it before a passkey unlocks the note.",
  phoneOnlyTitle: "Confirm by phone, not email",
  phoneOnlyBody: "This request never goes out by email. Confirm by calling the number on file:",
  submitted: "Sent to managers",
  submittedBody: "It is now on the manager board. Nothing is approved yet.",
  emptyDirectory: "No counterparties on file yet",
  emptyDirectorySupplier: "Ask a manager to add counterparties in the Directory tab.",
  emptyDirectoryManager: "Add the companies you deal with, using the phone number you already trust.",
  addContact: "Add counterparty",
  addContactHint: "Use details you already hold, never ones from an incoming message.",
  contactName: "Contact name",
  bankOnFileOptional: "Bank on file (optional)",
  institution: "Institution",
  transit: "Transit",
  account: "Account",
  contactAdded: "Counterparty added",
  caseLabel: "Case",
  checkingHash: "checking hash…",
  hashVerified: "hash verified",
  hashMismatch: "hash mismatch",
  hashMismatchBody: "These bytes do not match the sealed hash. Do not sign.",
  canonicalPayload: "Canonical payload",
  approvalProgress: "{done} of {needed} approved",
  twoManagers: "two different managers required",
  ceremonyHint: "The passkey ceremony unlocks these bytes. Its challenge binds to the hash below.",
  jevTitle: "Jev labels",
  waitingPasskey: "Waiting for passkey…",
  approvalRecorded: "Approval recorded",
  secondSignerNeeded: "A different manager must sign next.",
  revokeCase: "Revoke case",
  revokeCaseConfirm: "Revoke this case? Its partner receipt stops working.",
  cancel: "Cancel",
  dismiss: "Dismiss",
  statusSent: "Status sent",
  saveFailed: "Could not save",
};

const fr: Messages = {
  brand: "SupplyChek",
  place: "Une plateforme pour les organisations de la chaîne alimentaire",
  demoOrg: "Organisation de démonstration : Lake Ontario Cold Storage",
  sealedNote: "Rédigez une note scellée",
  flags: "Signaux",
  onFile: "Au dossier",
  asked: "Demandé",
  oob: "Appelez le numéro au dossier",
  reviewed: "J’ai lu ces octets",
  approve: "Approuver avec une clé d’accès",
  away: "Dans 15 minutes",
  loaded: "Chargé",
  rolling: "En route",
  arrived: "Arrivé",
  delayed: "En retard",
  warning: "Le chauffeur est à 15 minutes",
  matches: "Correspond au contenu déposé",
  notGov: "Attestation SupplyChek — ce n’est pas un sceau du gouvernement",
  jevNote: "Jev a étiqueté ce texte. Il ne l’a pas approuvé.",
  empty: "Rien ici pour le moment.",
  dual: "Deux personnes différentes doivent chacune utiliser une clé d’accès.",
  signIn: "Connexion",
  signOut: "Déconnexion",
  createPasskey: "Créer une clé d’accès",
  supplier: "Fournisseur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  receiver: "Réception",
  admin: "Administration",
  directory: "Répertoire",
  scenarios: "Scénarios",
  sendToManager: "Envoyer au bureau du gestionnaire",
  reviewBytes: "Relire les octets",
  passkeyStopped: "Clé d’accès interrompue",
  whoSpoke: "Avec qui vous avez parlé, et quand",
  back: "Retour",
  open: "Ouvrir",
  details: "Détails",
  carrier: "Transporteur",
  setpoint: "Consigne",
  loads: "Chargements",
  incoming: "En arrivée",
  pod: "Preuve de livraison",
  partnerCheck: "Vérification partenaire",
  dualControl: "Double contrôle",
  print: "Imprimer",
  copy: "Copier",
  copied: "Copié",
  skipToContent: "Aller au contenu",
  statusDraft: "Brouillon",
  statusFlagged: "Signalé",
  statusOob: "Appel à faire",
  statusPending: "Prêt à examiner",
  statusSecond: "Deuxième approbation requise",
  statusApproved: "Approuvé",
  statusRejected: "Refusé",
  statusRevoked: "Révoqué",
  scheduled: "Planifié",
  alerts: "alertes",
  holdCall:
    "L’approbation reste désactivée tant que chaque étape n’est pas cochée et que vous n’avez pas nommé la personne appelée.",
  notApproval: "Envoyer une photo n’approuve pas un changement.",
  signedInAs: "Connecté en tant que",
  noSession: "Aucune session active. Connectez-vous avec une clé d’accès liée à un seul compte.",
  signInWithPasskey: "Connexion avec clé d’accès",
  username: "Nom d’utilisateur",
  usernamePlaceholder: "Prénom, en minuscules",
  team: "Équipe",
  teamHint: "Tout le monde dans votre organisation. Les clés montrent qui a terminé le chiffrement.",
  addTeammate: "Ajouter un collègue",
  addTeammateHint: "Cette personne se connecte avec ce nom d’utilisateur et votre organisation, puis crée sa clé d’accès.",
  teammateAdded: "Collègue ajouté :",
  fullName: "Nom",
  role: "Rôle",
  encryption: "Chiffrement",
  keysReady: "clés prêtes",
  noKeys: "sans clés",
  passkeys: "Clés d’accès",
  noCredentials: "Aucune clé au dossier. Inscription depuis l’écran de connexion.",
  revoke: "Révoquer",
  revokeConfirm: "Retirer cette clé ? Réinscription depuis l’écran de connexion.",
  synced: "synchronisée",
  enrollmentCode: "Code d’inscription",
  enrollmentCodeHint: "Fourni par votre admin, pour la première configuration",
  codeIssued: "Code émis une fois — dictez-le, il ne s’affichera plus :",
  issueCode: "Émettre un code",
  createOrg: "Créer une organisation",
  newOrgHint: "Démarrez une nouvelle organisation. Vous en devenez l’admin.",
  orgName: "Nom de l’organisation",
  province: "Province",
  yourName: "Votre nom",
  orgCreated: "Organisation prête. Connectez-vous ci-dessous, puis créez votre clé d’accès.",
  orgLabel: "Organisation",
  orgPlaceholder: "Nom ou identifiant de l’organisation",
  accountHint: "Saisissez votre nom d’utilisateur et votre organisation. Aucun compte n’est listé ici.",
  identityRequired: "Saisissez d’abord votre nom d’utilisateur et votre organisation.",
  requests: "Demandes",
  who: "Qui",
  type: "Type",
  status: "État",
  hash: "Empreinte",
  load: "Chargement",
  goods: "Marchandise",
  dock: "Quai",
  seal: "Sceau",
  eta: "Heure prévue",
  company: "Entreprise",
  city: "Ville",
  domain: "Domaine",
  numberOnFile: "Numéro au dossier",
  scenariosHint: "Cinq messages d’attaque du jeu de démo, plus un changement en route.",
  sealedNoteHint: "Décrivez le changement ici pour la contrepartie vérifiée. Ne collez jamais de courriel. La note est scellée en empreinte à l’envoi.",
  loadsHint:
    "Quai et sceau approuvés restent au tableau jusqu’à ce qu’une nouvelle cérémonie les change.",
  incomingHint:
    "Vous voyez le quai au tableau. Un changement de destination ne le déplace pas tant que tout n’est pas approuvé.",
  podHint: "Une photo garde sa propre empreinte.",
  podSaved: "Photo enregistrée avec son empreinte.",
  pickLoad: "Choisir un chargement",
  liveLocation: "Position en direct",
  liveLocationHint: "Les positions du conducteur s’actualisent toutes les quelques secondes pendant un trajet.",
  noLive: "Aucun conducteur ne partage sa position pour l’instant.",
  lastKnown: "Dernière position",
  simulated: "simulé",
  startTrip: "Partager ma position",
  stopTrip: "Arrêter le partage",
  noLoads: "Aucun chargement assigné",
  noLoadsHint: "La répartition assigne les chargements à votre nom d’utilisateur. Rien n’est assigné pour l’instant.",
  messages: "Messages",
  messagesHint: "Chiffrement de bout en bout avec le protocole Signal. Le serveur ne voit que du chiffré.",
  noMessages: "Aucun message. Dites ce qui a changé.",
  messagePlaceholder: "Écrivez aux personnes de ce dossier…",
  send: "Envoyer",
  sending: "Envoi…",
  lockedMessage: "Verrouillé. Votre appareil ne peut pas ouvrir ce message.",
  noDevices: "Personne dans ce dossier n’a terminé le chiffrement.",
  thisDevice: "Cet appareil",
  resetKeys: "Réinitialiser le chiffrement",
  resetKeysConfirm: "Remplacer les clés de cet appareil ? Les messages envoyés aux anciennes clés restent verrouillés.",
  safetyNumber: "Numéro de sécurité",
  keyChanged: "clé changée",
  documents: "Documents",
  documentsHint: "Les fichiers sont enregistrés avec empreinte. Chacun peut revérifier plus tard.",
  uploading: "Téléversement…",
  toastSent: "Message scellé envoyé.",
  toastDocSaved: "Document enregistré avec son empreinte.",
  toastTrip: "Trajet en direct. Le réceptionnaire vous voit bouger.",
  toastTripStopped: "Partage de position arrêté.",
  emptyManager: "Rédigez une note scellée au bureau fournisseur.",
  directoryHint:
    "Numéros déjà au dossier. N’utilisez pas un numéro qui arrive dans une demande.",
  emptyCase: "Choisissez-en une au bureau du gestionnaire.",
  confirmBytes: "Confirmer ces octets",
  signedSoFar: "Signé jusqu’ici",
  nobody: "personne",
  openPartnerPage: "Ouvrir la page partenaire",
  bytesLocked: "Octets verrouillés",
  bytesLockedBody:
    "L’étape de clé d’accès exigeait une vérification de l’utilisateur. La page partenaire montre qui a signé et quand.",
  userVerification: "Vérification de l’utilisateur",
  yes: "Oui",
  no: "Non",
  noPartnerPage: "Pas encore de page partenaire",
  noPartnerPageBody:
    "Une page apparaît après que les clés d’accès requises ont signé la même empreinte.",
  oobHint:
    "L’approbation reste désactivée tant que chaque étape n’est pas cochée et que vous n’avez pas nommé la personne appelée.",
  backToBoard: "Retour au tableau",
  noRequestOpen: "Aucune demande ouverte",
  pickFromBoard: "Choisissez-en une au bureau du gestionnaire.",
  serverDown: "Serveur injoignable",
  serverDownBody:
    "Démarrez le serveur Next sur le port 3000. Les clés d’accès ont besoin de l’API. Il n’y a pas de connexion fictive.",
  passkeyCreated: "Clé d’accès créée pour ce compte.",
  creatingPasskey: "Création de la clé d’accès…",
  signingIn: "Connexion…",
  counterpartySearch: "Rechercher un partenaire par nom, domaine, ville…",
  noCounterparty: "Aucun partenaire ne correspond.",
  onFileCount: "au dossier",
  pickCounterparty: "Choisissez un partenaire",
  noteInOwnWords: "Décrivez le changement dans vos mots. Ne collez ni courriel ni lien.",
  sealPending: "sceau en attente",
  sealed: "scellé",
  sealHint: "Le hachage se fige à l’envoi. Les gestionnaires le vérifient avant qu’une clé d’accès déverrouille la note.",
  phoneOnlyTitle: "Confirmez par téléphone, pas par courriel",
  phoneOnlyBody: "Cette demande ne passe jamais par courriel. Confirmez en appelant le numéro au dossier :",
  submitted: "Envoyé aux gestionnaires",
  submittedBody: "La demande est sur le tableau des gestionnaires. Rien n’est encore approuvé.",
  emptyDirectory: "Aucun partenaire au dossier",
  emptyDirectorySupplier: "Demandez à un gestionnaire d’ajouter des partenaires dans l’onglet Répertoire.",
  emptyDirectoryManager: "Ajoutez les entreprises avec qui vous travaillez, avec le numéro que vous connaissez déjà.",
  addContact: "Ajouter un partenaire",
  addContactHint: "Utilisez les coordonnées que vous avez déjà, jamais celles d’un message reçu.",
  contactName: "Nom du contact",
  bankOnFileOptional: "Banque au dossier (facultatif)",
  institution: "Institution",
  transit: "Transit",
  account: "Compte",
  contactAdded: "Partenaire ajouté",
  caseLabel: "Dossier",
  checkingHash: "vérification du hachage…",
  hashVerified: "hachage vérifié",
  hashMismatch: "hachage non conforme",
  hashMismatchBody: "Ces octets ne correspondent pas au hachage scellé. Ne signez pas.",
  canonicalPayload: "Contenu canonique",
  approvalProgress: "{done} sur {needed} approuvé(s)",
  twoManagers: "deux gestionnaires différents requis",
  ceremonyHint: "La cérémonie de clé d’accès déverrouille ces octets. Son défi est lié au hachage ci-dessous.",
  jevTitle: "Étiquettes Jev",
  waitingPasskey: "En attente de la clé d’accès…",
  approvalRecorded: "Approbation enregistrée",
  secondSignerNeeded: "Un autre gestionnaire doit signer ensuite.",
  revokeCase: "Révoquer le dossier",
  revokeCaseConfirm: "Révoquer ce dossier? Son reçu partenaire cessera de fonctionner.",
  cancel: "Annuler",
  dismiss: "Fermer",
  statusSent: "Statut envoyé",
  saveFailed: "Enregistrement impossible",
};

const MAP = { en, fr } as const;

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "fr" ? "fr" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(readStoredLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: MAP[lang],
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("Missing I18nProvider");
  return ctx;
}

export function roleTitle(role: string, t: Messages): string {
  switch (role) {
    case "supplier":
      return t.supplier;
    case "manager":
      return t.manager;
    case "driver":
      return t.driver;
    case "receiver":
      return t.receiver;
    case "admin":
      return t.admin;
    default:
      return role;
  }
}

export function caseStatusTitle(status: string, t: Messages): string {
  switch (status) {
    case "draft":
      return t.statusDraft;
    case "flagged":
      return t.statusFlagged;
    case "oob_pending":
      return t.statusOob;
    case "pending_approval":
      return t.statusPending;
    case "pending_second":
      return t.statusSecond;
    case "fully_approved":
      return t.statusApproved;
    case "rejected":
      return t.statusRejected;
    case "revoked":
      return t.statusRevoked;
    default:
      return status;
  }
}

export function loadStatusTitle(status: string, t: Messages): string {
  switch (status) {
    case "scheduled":
      return t.scheduled;
    case "loaded":
      return t.loaded;
    case "rolling":
      return t.rolling;
    case "fifteen_min":
      return t.away;
    case "arrived":
      return t.arrived;
    case "delayed":
      return t.delayed;
    default:
      return status;
  }
}

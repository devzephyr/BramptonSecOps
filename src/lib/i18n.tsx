"use client";

import type { DocTypeName } from "@/lib/policy";
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
  matches: string;
  notGov: string;
  jevNote: string;
  empty: string;
  dual: string;
  signIn: string;
  signOut: string;
  createPasskey: string;
  supplier: string;
  logistics: string;
  warehouse: string;
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
  savedScenarios: string;
  scenarioName: string;
  saveScenario: string;
  deleteScenario: string;
  sealedNoteHint: string;
  loadsHint: string;
  incomingHint: string;
  yardTraffic: string;
  yardTrafficHint: string;
  inventory: string;
  inventoryHint: string;
  sku: string;
  quantity: string;
  location: string;
  dropoff: string;
  pickup: string;
  emptyInventory: string;
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
  docTypes: Record<DocTypeName, string>;
  docType: string;
  docNumber: string;
  docNumberHint: string;
  amount: string;
  currency: string;
  download: string;
  records: string;
  recordsHint: string;
  allTypes: string;
  exportCsv: string;
  totals: string;
  orgRecord: string;
  noDocuments: string;
  uploadedBy: string;
  date: string;
  file: string;
  linkedTo: string;
  toastTrip: string;
  toastTripStopped: string;
  directoryHint: string;
  emptyManager: string;
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
  mapDepot: string;
  mapYard: string;
  nextStep: string;
  reportDelay: string;
  delivered: string;
  deliveredBody: string;
  trailerPlate: string;
  sharingPosition: string;
  yourLoads: string;
  showAllLoads: string;
  correctStatus: string;
  tripHint: string;
  newRequest: string;
  newRequestHint: string;
  newLoad: string;
  newLoadHint: string;
  loadRef: string;
  origin: string;
  destination: string;
  plate: string;
  trailer: string;
  unassigned: string;
  createLoad: string;
  loadCreated: string;
  noDrivers: string;
  requestedChange: string;
  requestedChangeHint: string;
  editLoad: string;
  saveChanges: string;
  handoffNote: string;
  handoffNoteHint: string;
  history: string;
  noHistory: string;
  lockedMoving: string;
  loadUpdated: string;
  jobTitle: string;
  jobTitleHint: string;
  edit: string;
  editTeammate: string;
  teammateUpdated: string;
  eventHandoff: string;
  eventUpdated: string;
  fleet: string;
  fleetHint: string;
  dutyStatus: string;
  dutyOff: string;
  dutySleeper: string;
  dutyOn: string;
  dutyDriving: string;
  drivingClock: string;
  leftBeforeBreak: string;
  breakDue: string;
  breakOwed: string;
  breakOwedBody: string;
  breakLeft: string;
  overLimit: string;
  hosRule: string;
  dutyLog: string;
  dutyLogHint: string;
  chainIntact: string;
  chainBroken: string;
  addNote: string;
  notePlaceholder: string;
  noteAdded: string;
  correcting: string;
  noDutyEntries: string;
  sourceGps: string;
  sourceStatus: string;
  sourceManager: string;
  sourceSim: string;
  dutyChanged: string;
  today: string;
  lastWeek: string;
  dropAtFacility: string;
  facilityName: string;
  facilityHint: string;
  sealOnTrailer: string;
  sealBroken: string;
  recordDrop: string;
  handoffRecorded: string;
  sealException: string;
  custodyChain: string;
  noCustody: string;
  handOff: string;
  toDriver: string;
  toFacility: string;
  atFacility: string;
  atFacilities: string;
  journey: string;
  changePhoto: string;
  addPhoto: string;
  photoUpdated: string;
  noActiveLoads: string;
  eventCustody: string;
  sealOk: string;
  sealBad: string;
  trailHint: string;
};

const en: Messages = {
  brand: "SupplyChek",
  place: "Verified operations for food and cold-chain logistics",
  demoOrg: "Demo organization: Lake Ontario Cold Storage",
  sealedNote: "Write a sealed note",
  flags: "Flags",
  onFile: "On file",
  asked: "Asked for",
  oob: "Call the number on file",
  reviewed: "I have reviewed this request",
  approve: "Approve with passkey",
  away: "15 minutes away",
  loaded: "Loaded",
  rolling: "In transit",
  arrived: "Arrived",
  delayed: "Delayed",
  matches: "Matches uploaded content",
  notGov: "SupplyChek attestation — not a government certification",
  jevNote: "Automated labels are advisory. They do not approve anything.",
  empty: "Nothing here yet.",
  dual: "Two different people must each use a passkey.",
  signIn: "Sign in",
  signOut: "Sign out",
  createPasskey: "Create passkey",
  supplier: "Supplier",
  logistics: "Logistics",
  warehouse: "Warehouse",
  driver: "Driver",
  receiver: "Receiver",
  admin: "Admin",
  directory: "Directory",
  scenarios: "Scenarios",
  sendToManager: "Send to the logistics desk",
  reviewBytes: "Review the request",
  passkeyStopped: "The passkey request was cancelled or did not complete.",
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
  codeIssued: "Share this code with the user now. It will not be shown again:",
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
  savedScenarios: "Saved by your team",
  scenarioName: "Scenario name",
  saveScenario: "Save draft as scenario",
  deleteScenario: "Delete scenario",
  sealedNoteHint: "Write the change here for the verified counterparty. Never paste email text. The note seals to a hash at send.",
  loadsHint: "Approved dock and seal stay on the board until an approved request changes them.",
  incomingHint:
    "You see the dock on the board. A destination change does not move it until it is fully approved.",
  yardTraffic: "Yard traffic",
  yardTrafficHint: "Drivers arriving for pickup or dropoff. Status comes from the driver — this is not an approval.",
  inventory: "Inventory on hand",
  inventoryHint: "Lots currently stored in this warehouse.",
  sku: "SKU",
  quantity: "Qty",
  location: "Location",
  dropoff: "Dropoff",
  pickup: "Pickup",
  emptyInventory: "No inventory lots on file yet.",
  podHint: "A photo stays with its own hash.",
  podSaved: "Photo saved with its hash.",
  pickLoad: "Pick a load",
  liveLocation: "Live location",
  liveLocationHint: "Driver positions update every few seconds while a trip runs.",
  noLive: "No driver is sharing a live position right now.",
  lastKnown: "Last known",
  simulated: "simulated",
  startTrip: "Start simulated trip",
  stopTrip: "Stop sharing",
  noLoads: "No loads assigned",
  noLoadsHint: "Dispatch assigns loads to your username. Nothing is assigned yet.",
  messages: "Messages",
  messagesHint: "End-to-end encrypted with the Signal protocol. The server only sees ciphertext.",
  noMessages: "No messages yet.",
  messagePlaceholder: "Write to the people on this case…",
  send: "Send",
  sending: "Sending…",
  lockedMessage: "This message was encrypted for another device and cannot be opened here.",
  noDevices: "Nobody on this case finished encryption setup yet.",
  thisDevice: "This device",
  resetKeys: "Reset encryption",
  resetKeysConfirm: "Replace this device's keys? Messages sent to the old keys stay locked.",
  safetyNumber: "Safety number",
  keyChanged: "key changed",
  documents: "Documents",
  documentsHint: "Files are hash-recorded. Anyone can re-check the hash later.",
  uploading: "Uploading…",
  toastSent: "Encrypted message sent.",
  toastDocSaved: "Document saved with its hash.",
  docTypes: {
    bill_of_lading: "Bill of lading",
    proof_of_delivery: "Proof of delivery",
    invoice: "Invoice",
    receipt: "Receipt",
    rate_confirmation: "Rate confirmation",
    packing_list: "Packing list",
    customs: "Customs",
    insurance: "Insurance",
    other: "Other",
  },
  docType: "Document type",
  docNumber: "Number",
  docNumberHint: "BOL, invoice or receipt number",
  amount: "Amount",
  currency: "Currency",
  download: "Download",
  records: "Records",
  recordsHint: "Every bill of lading, invoice and receipt in one ledger. Downloads are re-checked against the hash recorded at upload.",
  allTypes: "All types",
  exportCsv: "Export CSV",
  totals: "Totals",
  orgRecord: "Organization record",
  noDocuments: "No documents yet.",
  uploadedBy: "Uploaded by",
  date: "Date",
  file: "File",
  linkedTo: "Linked to",
  toastTrip: "Simulated trip started. Your position is shared with the receiver.",
  toastTripStopped: "Stopped sharing position.",
  directoryHint: "Numbers already on file. Do not use a number that arrives inside a request.",
  emptyManager: "Write a sealed note on the supplier desk.",
  confirmBytes: "Confirm this request",
  signedSoFar: "Signed so far",
  nobody: "No one yet",
  openPartnerPage: "Open partner page",
  bytesLocked: "Request locked",
  bytesLockedBody:
    "The passkey step required user verification. The partner page shows who signed and when.",
  userVerification: "User verification",
  yes: "Yes",
  no: "No",
  noPartnerPage: "No partner page yet",
  noPartnerPageBody: "A page appears after the required passkeys sign the same hash.",
  backToBoard: "Back to board",
  noRequestOpen: "No request open",
  pickFromBoard: "Pick one from the logistics desk.",
  serverDown: "Server not reachable",
  serverDownBody: "The service is temporarily unavailable. Try again in a moment.",
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
  sealHint: "The hash locks at send. Logistics verifies it before a passkey unlocks the note.",
  phoneOnlyTitle: "Confirm by phone, not email",
  phoneOnlyBody: "This request never goes out by email. Confirm by calling the number on file:",
  submitted: "Sent to logistics",
  submittedBody: "It is now on the logistics board. Nothing is approved yet.",
  emptyDirectory: "No counterparties on file yet",
  emptyDirectorySupplier: "Ask logistics staff to add counterparties in the Directory tab.",
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
  hashMismatchBody: "This request does not match its sealed hash. Do not approve it.",
  canonicalPayload: "Canonical payload",
  approvalProgress: "{done} of {needed} approved",
  twoManagers: "two different logistics approvers required",
  ceremonyHint: "Your passkey signs the hash below, so the approval applies only to this exact request.",
  jevTitle: "Automated labels",
  waitingPasskey: "Waiting for passkey…",
  approvalRecorded: "Approval recorded",
  secondSignerNeeded: "A different logistics approver must sign next.",
  revokeCase: "Revoke case",
  revokeCaseConfirm: "Revoke this case? Its partner receipt stops working.",
  cancel: "Cancel",
  dismiss: "Dismiss",
  statusSent: "Status sent",
  saveFailed: "Could not save",
  mapDepot: "Depot",
  mapYard: "Yard",
  nextStep: "Next step",
  reportDelay: "Report a delay",
  delivered: "Delivered",
  deliveredBody: "Hand the paperwork to receiving. Nothing else is needed from you for this load.",
  trailerPlate: "Trailer · plate",
  sharingPosition: "Sharing position",
  yourLoads: "Your loads",
  showAllLoads: "Show all",
  correctStatus: "Correct the status",
  tripHint: "The simulated trip follows the depot-to-yard route and sends In transit, 15 minutes away, and Arrived for you.",
  newRequest: "New request",
  newRequestHint: "Log a request a counterparty made, in your own words. A different logistics approver must approve it.",
  newLoad: "New load",
  newLoadHint: "The assigned driver sees it on their next refresh and gets an alert.",
  loadRef: "Load reference",
  origin: "Origin",
  destination: "Destination",
  plate: "Plate",
  trailer: "Trailer",
  unassigned: "Unassigned",
  createLoad: "Create load",
  loadCreated: "Load created",
  noDrivers: "No drivers on the team yet. Add one in the Team tab.",
  requestedChange: "Requested change",
  requestedChangeHint: "Type what the counterparty asked for. Approvers see it side by side with what is on file.",
  editLoad: "Edit or hand off",
  saveChanges: "Save changes",
  handoffNote: "Handoff location (optional)",
  handoffNoteHint: "e.g. truck stop, Napanee ON",
  history: "History",
  noHistory: "No changes yet.",
  lockedMoving: "Dock, destination, and seal are locked while the load is moving. Open a request to change them.",
  loadUpdated: "Load updated",
  jobTitle: "Job title",
  jobTitleHint: "Pick a suggestion or type your own.",
  edit: "Edit",
  editTeammate: "Edit teammate",
  teammateUpdated: "Teammate updated",
  eventHandoff: "Handoff",
  eventUpdated: "Edited",
  fleet: "Fleet",
  fleetHint: "Every driver, their duty clock, and where their loads are. Refreshes every 15 seconds.",
  dutyStatus: "Duty status",
  dutyOff: "Off duty",
  dutySleeper: "Sleeper berth",
  dutyOn: "On duty, not driving",
  dutyDriving: "Driving",
  drivingClock: "Driving since last break",
  leftBeforeBreak: "Left before a break",
  breakDue: "Break due soon",
  breakOwed: "Break required",
  breakOwedBody: "8 hours of driving reached. Stop for 30 minutes in a row before driving again.",
  breakLeft: "Break time left",
  overLimit: "Over the limit by",
  hosRule: "Rule: a 30-minute break after 8 hours of driving.",
  dutyLog: "Duty log",
  dutyLogHint: "The server clock stamps every entry; nobody can change the time. To fix a mistake, add a note. The original entry stays.",
  chainIntact: "Log verified, no entry altered",
  chainBroken: "Log altered at entry",
  addNote: "Add note",
  notePlaceholder: "What happened, e.g. forgot to switch to on duty at 14:10",
  noteAdded: "Note added",
  correcting: "Note on entry",
  noDutyEntries: "No entries in this period.",
  sourceGps: "detected by GPS",
  sourceStatus: "from a trip step",
  sourceManager: "logistics note",
  sourceSim: "simulated trip",
  dutyChanged: "Duty status updated",
  today: "Today",
  lastWeek: "Last 7 days",
  dropAtFacility: "Drop at a warehouse or yard",
  facilityName: "Warehouse or yard",
  facilityHint: "e.g. Hamilton Flour Exchange, Door 9",
  sealOnTrailer: "Seal number on the trailer",
  sealBroken: "Seal is broken or missing",
  recordDrop: "Record drop",
  handoffRecorded: "Handoff recorded",
  sealException: "Seal exception recorded. Logistics staff were alerted.",
  custodyChain: "Chain of custody",
  noCustody: "No handoffs yet.",
  handOff: "Hand off",
  toDriver: "To a driver",
  toFacility: "To a warehouse or yard",
  atFacility: "At",
  atFacilities: "Loads at warehouses and yards",
  journey: "Journey",
  changePhoto: "Change photo",
  addPhoto: "Add photo",
  photoUpdated: "Photo updated",
  noActiveLoads: "No active loads",
  eventCustody: "Custody",
  sealOk: "Seal checked",
  sealBad: "Seal exception",
  trailHint: "Solid line: where the truck actually went. Dashed: the planned route.",
};

const fr: Messages = {
  brand: "SupplyChek",
  place: "Opérations vérifiées pour la logistique alimentaire et la chaîne du froid",
  demoOrg: "Organisation de démonstration : Lake Ontario Cold Storage",
  sealedNote: "Rédigez une note scellée",
  flags: "Signaux",
  onFile: "Au dossier",
  asked: "Demandé",
  oob: "Appelez le numéro au dossier",
  reviewed: "J’ai examiné cette demande",
  approve: "Approuver avec une clé d’accès",
  away: "Dans 15 minutes",
  loaded: "Chargé",
  rolling: "En transit",
  arrived: "Arrivé",
  delayed: "En retard",
  matches: "Correspond au contenu déposé",
  notGov: "Attestation SupplyChek — ce n’est pas un sceau du gouvernement",
  jevNote: "Les étiquettes automatiques sont indicatives. Elles n’approuvent rien.",
  empty: "Rien ici pour le moment.",
  dual: "Deux personnes différentes doivent chacune utiliser une clé d’accès.",
  signIn: "Connexion",
  signOut: "Déconnexion",
  createPasskey: "Créer une clé d’accès",
  supplier: "Fournisseur",
  logistics: "Logistique",
  warehouse: "Entrepôt",
  driver: "Chauffeur",
  receiver: "Réception",
  admin: "Administration",
  directory: "Répertoire",
  scenarios: "Scénarios",
  sendToManager: "Envoyer au bureau de la logistique",
  reviewBytes: "Examiner la demande",
  passkeyStopped: "La demande de clé d’accès a été annulée ou n’a pas abouti.",
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
  codeIssued: "Transmettez ce code à l’utilisateur maintenant. Il ne sera plus affiché :",
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
  savedScenarios: "Enregistrés par votre équipe",
  scenarioName: "Nom du scénario",
  saveScenario: "Enregistrer le brouillon comme scénario",
  deleteScenario: "Supprimer le scénario",
  sealedNoteHint: "Décrivez le changement ici pour la contrepartie vérifiée. Ne collez jamais de courriel. La note est scellée en empreinte à l’envoi.",
  loadsHint:
    "Quai et sceau approuvés restent au tableau jusqu’à ce qu’une demande approuvée les change.",
  incomingHint:
    "Vous voyez le quai au tableau. Un changement de destination ne le déplace pas tant que tout n’est pas approuvé.",
  yardTraffic: "Circulation à la cour",
  yardTrafficHint:
    "Chauffeurs qui arrivent pour un ramassage ou une livraison. L’état vient du chauffeur — ce n’est pas une approbation.",
  inventory: "Inventaire sur place",
  inventoryHint: "Lots actuellement entreposés dans cet entrepôt.",
  sku: "UGS",
  quantity: "Qté",
  location: "Emplacement",
  dropoff: "Livraison",
  pickup: "Ramassage",
  emptyInventory: "Aucun lot d’inventaire au dossier pour l’instant.",
  podHint: "Une photo garde sa propre empreinte.",
  podSaved: "Photo enregistrée avec son empreinte.",
  pickLoad: "Choisir un chargement",
  liveLocation: "Position en direct",
  liveLocationHint: "Les positions du conducteur s’actualisent toutes les quelques secondes pendant un trajet.",
  noLive: "Aucun conducteur ne partage sa position pour l’instant.",
  lastKnown: "Dernière position",
  simulated: "simulé",
  startTrip: "Démarrer un trajet simulé",
  stopTrip: "Arrêter le partage",
  noLoads: "Aucun chargement assigné",
  noLoadsHint: "La répartition assigne les chargements à votre nom d’utilisateur. Rien n’est assigné pour l’instant.",
  messages: "Messages",
  messagesHint: "Chiffrement de bout en bout avec le protocole Signal. Le serveur ne voit que du chiffré.",
  noMessages: "Aucun message pour l’instant.",
  messagePlaceholder: "Écrivez aux personnes de ce dossier…",
  send: "Envoyer",
  sending: "Envoi…",
  lockedMessage: "Ce message a été chiffré pour un autre appareil et ne peut pas être ouvert ici.",
  noDevices: "Personne dans ce dossier n’a terminé le chiffrement.",
  thisDevice: "Cet appareil",
  resetKeys: "Réinitialiser le chiffrement",
  resetKeysConfirm: "Remplacer les clés de cet appareil ? Les messages envoyés aux anciennes clés restent verrouillés.",
  safetyNumber: "Numéro de sécurité",
  keyChanged: "clé changée",
  documents: "Documents",
  documentsHint: "Les fichiers sont enregistrés avec empreinte. Chacun peut revérifier plus tard.",
  uploading: "Téléversement…",
  toastSent: "Message chiffré envoyé.",
  toastDocSaved: "Document enregistré avec son empreinte.",
  docTypes: {
    bill_of_lading: "Connaissement",
    proof_of_delivery: "Preuve de livraison",
    invoice: "Facture",
    receipt: "Reçu",
    rate_confirmation: "Confirmation de tarif",
    packing_list: "Liste de colisage",
    customs: "Douanes",
    insurance: "Assurance",
    other: "Autre",
  },
  docType: "Type de document",
  docNumber: "Numéro",
  docNumberHint: "Numéro de connaissement, de facture ou de reçu",
  amount: "Montant",
  currency: "Devise",
  download: "Télécharger",
  records: "Registres",
  recordsHint: "Connaissements, factures et reçus dans un seul registre. Chaque téléchargement est revérifié contre l’empreinte enregistrée.",
  allTypes: "Tous les types",
  exportCsv: "Exporter CSV",
  totals: "Totaux",
  orgRecord: "Registre de l’organisation",
  noDocuments: "Aucun document pour l’instant.",
  uploadedBy: "Téléversé par",
  date: "Date",
  file: "Fichier",
  linkedTo: "Lié à",
  toastTrip: "Trajet simulé démarré. Votre position est partagée avec le réceptionnaire.",
  toastTripStopped: "Partage de position arrêté.",
  emptyManager: "Rédigez une note scellée au bureau fournisseur.",
  directoryHint:
    "Numéros déjà au dossier. N’utilisez pas un numéro qui arrive dans une demande.",
  confirmBytes: "Confirmer cette demande",
  signedSoFar: "Signé jusqu’ici",
  nobody: "Personne pour l’instant",
  openPartnerPage: "Ouvrir la page partenaire",
  bytesLocked: "Demande verrouillée",
  bytesLockedBody:
    "L’étape de clé d’accès exigeait une vérification de l’utilisateur. La page partenaire montre qui a signé et quand.",
  userVerification: "Vérification de l’utilisateur",
  yes: "Oui",
  no: "Non",
  noPartnerPage: "Pas encore de page partenaire",
  noPartnerPageBody:
    "Une page apparaît après que les clés d’accès requises ont signé la même empreinte.",
  backToBoard: "Retour au tableau",
  noRequestOpen: "Aucune demande ouverte",
  pickFromBoard: "Choisissez-en une au bureau de la logistique.",
  serverDown: "Serveur injoignable",
  serverDownBody: "Le service est temporairement indisponible. Réessayez dans un instant.",
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
  sealHint: "Le hachage se fige à l’envoi. La logistique le vérifie avant qu’une clé d’accès déverrouille la note.",
  phoneOnlyTitle: "Confirmez par téléphone, pas par courriel",
  phoneOnlyBody: "Cette demande ne passe jamais par courriel. Confirmez en appelant le numéro au dossier :",
  submitted: "Envoyé à la logistique",
  submittedBody: "C’est maintenant sur le tableau de la logistique. Rien n’est encore approuvé.",
  emptyDirectory: "Aucun partenaire au dossier",
  emptyDirectorySupplier: "Demandez à la logistique d’ajouter des partenaires dans l’onglet Répertoire.",
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
  hashMismatchBody: "Cette demande ne correspond pas à son empreinte scellée. Ne l’approuvez pas.",
  canonicalPayload: "Contenu canonique",
  approvalProgress: "{done} sur {needed} approuvé(s)",
  twoManagers: "deux approbateurs logistique différents requis",
  ceremonyHint: "Votre clé d’accès signe l’empreinte ci-dessous : l’approbation ne s’applique qu’à cette demande exacte.",
  jevTitle: "Étiquettes automatiques",
  waitingPasskey: "En attente de la clé d’accès…",
  approvalRecorded: "Approbation enregistrée",
  secondSignerNeeded: "Un autre approbateur logistique doit signer ensuite.",
  revokeCase: "Révoquer le dossier",
  revokeCaseConfirm: "Révoquer ce dossier? Son reçu partenaire cessera de fonctionner.",
  cancel: "Annuler",
  dismiss: "Fermer",
  statusSent: "Statut envoyé",
  saveFailed: "Enregistrement impossible",
  mapDepot: "Entrepôt",
  mapYard: "Cour",
  nextStep: "Prochaine étape",
  reportDelay: "Signaler un retard",
  delivered: "Livré",
  deliveredBody: "Remettez les documents à la réception. Rien d’autre n’est requis pour ce chargement.",
  trailerPlate: "Remorque · plaque",
  sharingPosition: "Position partagée",
  yourLoads: "Vos chargements",
  showAllLoads: "Tout afficher",
  correctStatus: "Corriger le statut",
  tripHint: "Le trajet simulé suit la route entrepôt-cour et envoie les statuts à votre place.",
  newRequest: "Nouvelle demande",
  newRequestHint: "Consignez la demande d’un partenaire dans vos mots. Un autre approbateur logistique doit l’approuver.",
  newLoad: "Nouveau chargement",
  newLoadHint: "Le chauffeur assigné le voit à la prochaine actualisation et reçoit une alerte.",
  loadRef: "Référence du chargement",
  origin: "Origine",
  destination: "Destination",
  plate: "Plaque",
  trailer: "Remorque",
  unassigned: "Non assigné",
  createLoad: "Créer le chargement",
  loadCreated: "Chargement créé",
  noDrivers: "Aucun chauffeur dans l’équipe. Ajoutez-en un dans l’onglet Équipe.",
  requestedChange: "Changement demandé",
  requestedChangeHint: "Saisissez ce que le partenaire a demandé. Les approbateurs le voient à côté de ce qui est au dossier.",
  editLoad: "Modifier ou transférer",
  saveChanges: "Enregistrer",
  handoffNote: "Lieu du transfert (facultatif)",
  handoffNoteHint: "ex. relais routier, Napanee (Ont.)",
  history: "Historique",
  noHistory: "Aucun changement pour l’instant.",
  lockedMoving: "Le quai, la destination et le sceau sont verrouillés pendant le trajet. Ouvrez une demande pour les modifier.",
  loadUpdated: "Chargement mis à jour",
  jobTitle: "Poste",
  jobTitleHint: "Choisissez une suggestion ou saisissez la vôtre.",
  edit: "Modifier",
  editTeammate: "Modifier le coéquipier",
  teammateUpdated: "Coéquipier mis à jour",
  eventHandoff: "Transfert",
  eventUpdated: "Modifié",
  fleet: "Flotte",
  fleetHint: "Chaque chauffeur, son temps de conduite et la position de ses chargements. Actualisé toutes les 15 secondes.",
  dutyStatus: "Statut de service",
  dutyOff: "Hors service",
  dutySleeper: "Couchette",
  dutyOn: "En service, sans conduire",
  dutyDriving: "Conduite",
  drivingClock: "Conduite depuis la dernière pause",
  leftBeforeBreak: "Avant la pause obligatoire",
  breakDue: "Pause bientôt obligatoire",
  breakOwed: "Pause obligatoire",
  breakOwedBody: "8 heures de conduite atteintes. Arrêtez-vous 30 minutes consécutives avant de reprendre la route.",
  breakLeft: "Pause restante",
  overLimit: "Dépassement de",
  hosRule: "Règle : une pause de 30 minutes après 8 heures de conduite.",
  dutyLog: "Registre de service",
  dutyLogHint: "L'horloge du serveur horodate chaque entrée; personne ne peut changer l'heure. Pour corriger une erreur, ajoutez une note. L'entrée d'origine reste.",
  chainIntact: "Registre vérifié, aucune entrée modifiée",
  chainBroken: "Registre modifié à l'entrée",
  addNote: "Ajouter une note",
  notePlaceholder: "Ce qui s'est passé, p. ex. oublié de passer en service à 14 h 10",
  noteAdded: "Note ajoutée",
  correcting: "Note sur l'entrée",
  noDutyEntries: "Aucune entrée pour cette période.",
  sourceGps: "détecté par GPS",
  sourceStatus: "depuis une étape du trajet",
  sourceManager: "note de la logistique",
  sourceSim: "trajet simulé",
  dutyChanged: "Statut de service mis à jour",
  today: "Aujourd'hui",
  lastWeek: "7 derniers jours",
  dropAtFacility: "Déposer à un entrepôt ou une cour",
  facilityName: "Entrepôt ou cour",
  facilityHint: "p. ex. Hamilton Flour Exchange, porte 9",
  sealOnTrailer: "Numéro de scellé sur la remorque",
  sealBroken: "Scellé brisé ou absent",
  recordDrop: "Enregistrer le dépôt",
  handoffRecorded: "Transfert enregistré",
  sealException: "Anomalie de scellé enregistrée. L’équipe logistique a été avertie.",
  custodyChain: "Chaîne de possession",
  noCustody: "Aucun transfert pour l'instant.",
  handOff: "Transférer",
  toDriver: "À un chauffeur",
  toFacility: "À un entrepôt ou une cour",
  atFacility: "À",
  atFacilities: "Chargements aux entrepôts et cours",
  journey: "Trajet",
  changePhoto: "Changer la photo",
  addPhoto: "Ajouter une photo",
  photoUpdated: "Photo mise à jour",
  noActiveLoads: "Aucun chargement actif",
  eventCustody: "Possession",
  sealOk: "Scellé vérifié",
  sealBad: "Anomalie de scellé",
  trailHint: "Ligne pleine : le trajet réel du camion. Pointillés : l'itinéraire prévu.",
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
    case "logistics":
      return t.logistics;
    case "warehouse":
      return t.warehouse;
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

export function dutyStatusTitle(status: string | null, t: Messages): string {
  switch (status) {
    case "off_duty":
      return t.dutyOff;
    case "sleeper_berth":
      return t.dutySleeper;
    case "on_duty":
      return t.dutyOn;
    case "driving":
      return t.dutyDriving;
    default:
      return status ?? "";
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

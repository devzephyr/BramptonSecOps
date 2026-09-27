"use client";

import type { DocTypeName } from "@/lib/policy";
import type { FlagView } from "@/lib/flags";
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
  firstTime: string;
  firstTimeHint: string;
  firstTimeRequired: string;
  newOrgTab: string;
  newOrgRequired: string;
  orgReady: string;
  orgReadyBody: string;
  receiptTitle: string;
  receiptChange: string;
  receiptOnFile: string;
  receiptRequested: string;
  receiptApprovals: string;
  receiptSignature: string;
  receiptStamp: string;
  receiptCaption: string;
  signOut: string;
  createPasskey: string;
  supplier: string;
  logistics: string;
  warehouse: string;
  driver: string;
  coDriver: string;
  noCoDriver: string;
  swapDrivers: string;
  youAreDriving: string;
  coDriverDriving: string;
  driversSwapped: string;
  eventSwap: string;
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
  noAlerts: string;
  holdCall: string;
  notApproval: string;
  signedInAs: string;
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
  otherTypeLabel: string;
  otherTypeHint: string;
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
  startFleetSim: string;
  stopFleetSim: string;
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
  referenceCode: string;
  referenceHint: string;
  technicalDetails: string;
  fullFingerprint: string;
  currentValue: string;
  newValue: string;
  unchanged: string;
  youApproved: string;
  youApprovedBody: string;
  callRecordLocked: string;
  calledBy: string;
  mailReminder: string;
  notDelivered: string;
  verifyPeople: string;
  verifyPeopleHint: string;
  flagText: Record<string, string>;
  jevText: Record<string, string>;
};

const en: Messages = {
  brand: "SupplyChek",
  place: "Verified operations for food and cold-chain logistics",
  demoOrg: "Demo organization: Lake Ontario Cold Storage",
  sealedNote: "Log a change request",
  flags: "Warning signs",
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
  matches: "Supporting documents attached",
  notGov: "Issued by SupplyChek. Not a government certification.",
  jevNote: "Suggested automatically to help you review. They don't approve anything.",
  empty: "Nothing here yet.",
  dual: "Two different people must each approve with their passkey.",
  signIn: "Sign in",
  firstTime: "First time here",
  firstTimeHint: "Use the enrollment code from your admin to create a passkey on this device.",
  firstTimeRequired: "Enter your username, organization and enrollment code.",
  newOrgTab: "New organization",
  newOrgRequired: "Enter the organization name, your name and a username.",
  orgReady: "Your organization is ready",
  orgReadyBody: "Save this enrollment code. It is shown once. Then create your passkey below.",
  receiptTitle: "Verification receipt",
  receiptChange: "Bank change · Maple Malt",
  receiptOnFile: "Account on file",
  receiptRequested: "Requested",
  receiptApprovals: "Passkey approvals",
  receiptSignature: "Signature",
  receiptStamp: "Verified",
  receiptCaption: "Every bank, dock and carrier change is checked against the number on file, then signed by two people before anyone acts on it.",
  signOut: "Sign out",
  createPasskey: "Create passkey",
  supplier: "Supplier",
  logistics: "Logistics",
  warehouse: "Warehouse",
  driver: "Driver",
  coDriver: "Co-driver",
  noCoDriver: "No co-driver",
  swapDrivers: "Swap drivers",
  youAreDriving: "You are at the wheel",
  coDriverDriving: "Your co-driver is at the wheel",
  driversSwapped: "Drivers swapped. Resting driver moved to sleeper berth.",
  eventSwap: "Driver swap",
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
  noAlerts: "No alerts yet.",
  holdCall: "Complete each step and name who you spoke with to continue.",
  notApproval: "Uploading a photo does not approve a change.",
  signedInAs: "Signed in as",
  signInWithPasskey: "Sign in with passkey",
  username: "Username",
  usernamePlaceholder: "First name, lower case",
  team: "Team",
  teamHint: "Everyone in your organization, and whether they have set up secure messaging.",
  addTeammate: "Add teammate",
  addTeammateHint: "They sign in with this username and your organization, then create their passkey.",
  teammateAdded: "Teammate added:",
  fullName: "Name",
  role: "Role",
  encryption: "Secure messaging",
  keysReady: "ready",
  noKeys: "not set up",
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
  orgLabel: "Organization",
  orgPlaceholder: "Organization name or ID",
  accountHint: "Enter your own username and organization. Accounts are not listed here.",
  identityRequired: "Enter your username and organization first.",
  requests: "Requests",
  who: "Who",
  type: "Type",
  status: "Status",
  hash: "Reference",
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
  sealedNoteHint: "Describe the change in your own words. Don't paste the email. Once sent, the request is locked; any change restarts approval.",
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
  podHint: "Photos are sealed when uploaded, so any later change would show.",
  podSaved: "Photo saved.",
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
  messagesHint: "Private to the people on this case. Messages are encrypted on your device, so SupplyChek can't read them.",
  noMessages: "No messages yet.",
  messagePlaceholder: "Write to the people on this case…",
  send: "Send",
  sending: "Sending…",
  lockedMessage: "This message can't be opened on this device. It was sent before you set up this device, or to a device you used before.",
  noDevices: "Nobody else on this case can receive messages yet. They need to open the case once.",
  thisDevice: "This device",
  resetKeys: "Set up messaging again on this device",
  resetKeysConfirm: "Set up secure messaging again on this device? Messages sent before now won't open here.",
  safetyNumber: "Safety number",
  keyChanged: "safety number changed",
  documents: "Documents",
  documentsHint: "Each file is sealed when uploaded. If anyone changes it later, the download is blocked.",
  uploading: "Uploading…",
  toastSent: "Message sent.",
  toastDocSaved: "Document saved.",
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
  otherTypeLabel: "What is this document?",
  otherTypeHint: "e.g. Fuel receipt, scale ticket, inspection report",
  amount: "Amount",
  currency: "Currency",
  download: "Download",
  records: "Records",
  recordsHint: "Every bill of lading, invoice and receipt in one place. Each file is checked for changes before it downloads.",
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
  emptyManager: "New change requests from the supplier desk show up here.",
  confirmBytes: "Confirm this request",
  signedSoFar: "Approved so far",
  nobody: "No one yet",
  openPartnerPage: "Open partner page",
  bytesLocked: "Approved",
  bytesLockedBody: "Each approver confirmed with their fingerprint, face, or device PIN. The partner page shows who approved and when.",
  userVerification: "Confirmed with fingerprint, face, or PIN",
  yes: "Yes",
  no: "No",
  noPartnerPage: "No partner page yet",
  noPartnerPageBody: "The partner page appears once everyone required has approved.",
  backToBoard: "Back to board",
  noRequestOpen: "No request open",
  pickFromBoard: "Pick one from the logistics desk.",
  serverDown: "Server not reachable",
  serverDownBody: "The service is temporarily unavailable. Try again in a moment.",
  passkeyCreated: "Passkey created for this account.",
  creatingPasskey: "Creating passkey…",
  signingIn: "Signing in…",
  counterpartySearch: "Search partners by name, email domain, or city…",
  noCounterparty: "No partner matches.",
  onFileCount: "on file",
  pickCounterparty: "Pick a partner",
  noteInOwnWords: "Describe the change in your own words. Do not paste email or links.",
  sealPending: "not sent yet",
  sealed: "sent and locked",
  sealHint: "Once sent, the request is locked. Logistics checks it before anyone approves.",
  phoneOnlyTitle: "Confirm by phone, not email",
  phoneOnlyBody: "This request never goes out by email. Confirm by calling the number on file:",
  submitted: "Sent to logistics",
  submittedBody: "It is now on the logistics board. Nothing is approved yet.",
  emptyDirectory: "No counterparties on file yet",
  emptyDirectorySupplier: "Ask logistics staff to add counterparties in the Directory tab.",
  emptyDirectoryManager: "Add the companies you deal with, using the phone number you already trust.",
  addContact: "Add partner",
  addContactHint: "Use details you already hold, never ones from an incoming message.",
  contactName: "Contact name",
  bankOnFileOptional: "Bank on file (optional)",
  institution: "Institution",
  transit: "Transit",
  account: "Account",
  contactAdded: "Partner added",
  caseLabel: "Case",
  checkingHash: "Checking…",
  hashVerified: "Unchanged since sent",
  hashMismatch: "Changed after it was sent",
  hashMismatchBody: "This request was changed after it was sent. Don't approve it. Ask the sender to submit it again.",
  canonicalPayload: "What's changing",
  approvalProgress: "{done} of {needed} approved",
  twoManagers: "two different logistics approvers required",
  ceremonyHint: "Your passkey approves exactly what is shown here. If anything changes afterwards, this approval no longer counts.",
  jevTitle: "Suggested categories",
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
  newRequestHint: "Log a request a partner made, in your own words. A different logistics approver must approve it.",
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
  requestedChangeHint: "Type what the partner asked for. Approvers see it side by side with what is on file.",
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
  startFleetSim: "Simulate fleet",
  stopFleetSim: "Stop simulation",
  fleetHint: "Every driver, their duty clock, and where their loads are. Refreshes every 5 seconds.",
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
  dutyLogHint: "Each entry is timed automatically and can't be edited or back-dated. To fix a mistake, add a note; the original entry stays.",
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
  referenceCode: "Reference code",
  referenceHint: "Read this code to the other approver or the partner to confirm you're looking at the same request.",
  technicalDetails: "Technical details",
  fullFingerprint: "Full fingerprint of the request (SHA-256)",
  currentValue: "On file now",
  newValue: "Requested",
  unchanged: "unchanged",
  youApproved: "You approved this request",
  youApprovedBody: "A different approver needs to approve it next. You'll get an alert when it's done.",
  callRecordLocked: "The call record is locked because this request has an approval.",
  calledBy: "Call record",
  mailReminder: "A genuine-looking email doesn't prove a request is real. Confirm by calling the number on file.",
  notDelivered: "Can't read new messages yet (hasn't opened this case)",
  verifyPeople: "Verify who you're talking to",
  verifyPeopleHint: "Compare these numbers with each person, in person or by phone. If they match, nobody is intercepting your messages.",
  flagText: {
    "FREE_EMAIL_DOMAIN": "Sent from a free email account ({email})",
    "LOOKALIKE_DOMAIN": "Look-alike email address: {domain} imitates {onFile}",
    "DOMAIN_NOT_ON_FILE": "Sent from {domain}, not their address on file ({onFile})",
    "DOMAIN_NOT_ON_FILE_SHORT": "Not sent from their address on file ({onFile})",
    "HOMOGLYPH": "Uses look-alike letters from another alphabet",
    "URGENCY_OR_SECRECY": "Pressures you to act fast or not to call",
    "PAYMENT_DETAIL_CHANGE": "Asks to change where payments go",
    "ON_FILE_MISMATCH": "{field} differs from what's on file",
    "CREDENTIAL_ASK": "Asks for a login, code, or access link",
    "OT_REMOTE_ACCESS": "Asks for remote access to plant or warehouse systems",
    "NEW_CARRIER": "Introduces a carrier you may not have used",
    "DESTINATION_OR_DOCK_CHANGE": "Changes a dock, yard, or delivery address",
    "DOCUMENT_OR_SEAL_CHANGE": "Changes a seal number, bill of lading, or proof of delivery",
    "MAIL_AUTH_NOT_CHECKED": "A genuine-looking email doesn't prove a request is real. Confirm by calling the number on file.",
  },
  jevText: {
    "payment-redirection": "Payment redirection",
    "urgency": "Pressure to act fast",
    "carrier-introduction": "New carrier",
    "route-change": "Route change",
    "access-request": "Access request",
  },
};

const fr: Messages = {
  brand: "SupplyChek",
  place: "Opérations vérifiées pour la logistique alimentaire et la chaîne du froid",
  demoOrg: "Organisation de démonstration : Lake Ontario Cold Storage",
  sealedNote: "Consigner une demande de changement",
  flags: "Signaux d'alerte",
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
  matches: "Pièces justificatives jointes",
  notGov: "Émis par SupplyChek. Il ne s'agit pas d'une certification gouvernementale.",
  jevNote: "Suggérées automatiquement pour faciliter la revue. Elles n'approuvent rien.",
  empty: "Rien ici pour le moment.",
  dual: "Deux personnes différentes doivent chacune approuver avec leur clé d'accès.",
  signIn: "Connexion",
  firstTime: "Première connexion",
  firstTimeHint: "Utilisez le code d’inscription de votre admin pour créer une clé d’accès sur cet appareil.",
  firstTimeRequired: "Entrez votre nom d’utilisateur, votre organisation et votre code d’inscription.",
  newOrgTab: "Nouvelle organisation",
  newOrgRequired: "Entrez le nom de l’organisation, votre nom et un nom d’utilisateur.",
  orgReady: "Votre organisation est prête",
  orgReadyBody: "Conservez ce code d’inscription. Il n’est affiché qu’une fois. Créez ensuite votre clé d’accès ci-dessous.",
  receiptTitle: "Reçu de vérification",
  receiptChange: "Changement bancaire · Maple Malt",
  receiptOnFile: "Compte au dossier",
  receiptRequested: "Demandé",
  receiptApprovals: "Approbations par clé",
  receiptSignature: "Signature",
  receiptStamp: "Vérifié",
  receiptCaption: "Chaque changement bancaire, de quai ou de transporteur est vérifié auprès du numéro au dossier, puis signé par deux personnes avant toute action.",
  signOut: "Déconnexion",
  createPasskey: "Créer une clé d’accès",
  supplier: "Fournisseur",
  logistics: "Logistique",
  warehouse: "Entrepôt",
  driver: "Chauffeur",
  coDriver: "Co-conducteur",
  noCoDriver: "Aucun co-conducteur",
  swapDrivers: "Échanger les conducteurs",
  youAreDriving: "Vous êtes au volant",
  coDriverDriving: "Votre co-conducteur est au volant",
  driversSwapped: "Conducteurs échangés. Le conducteur au repos passe en couchette.",
  eventSwap: "Échange de conducteurs",
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
  noAlerts: "Aucune alerte pour l’instant.",
  holdCall: "Terminez chaque étape et indiquez à qui vous avez parlé pour continuer.",
  notApproval: "Envoyer une photo n’approuve pas un changement.",
  signedInAs: "Connecté en tant que",
  signInWithPasskey: "Connexion avec clé d’accès",
  username: "Nom d’utilisateur",
  usernamePlaceholder: "Prénom, en minuscules",
  team: "Équipe",
  teamHint: "Toutes les personnes de votre organisation, et si elles ont activé la messagerie sécurisée.",
  addTeammate: "Ajouter un collègue",
  addTeammateHint: "Cette personne se connecte avec ce nom d’utilisateur et votre organisation, puis crée sa clé d’accès.",
  teammateAdded: "Collègue ajouté :",
  fullName: "Nom",
  role: "Rôle",
  encryption: "Messagerie sécurisée",
  keysReady: "activée",
  noKeys: "non activée",
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
  orgLabel: "Organisation",
  orgPlaceholder: "Nom ou identifiant de l'organisation",
  accountHint: "Saisissez votre nom d’utilisateur et votre organisation. Aucun compte n’est listé ici.",
  identityRequired: "Saisissez d’abord votre nom d’utilisateur et votre organisation.",
  requests: "Demandes",
  who: "Qui",
  type: "Type",
  status: "État",
  hash: "Référence",
  load: "Chargement",
  goods: "Marchandise",
  dock: "Quai",
  seal: "Scellé",
  eta: "Heure prévue",
  company: "Entreprise",
  city: "Ville",
  domain: "Domaine",
  numberOnFile: "Numéro au dossier",
  savedScenarios: "Enregistrés par votre équipe",
  scenarioName: "Nom du scénario",
  saveScenario: "Enregistrer le brouillon comme scénario",
  deleteScenario: "Supprimer le scénario",
  sealedNoteHint: "Décrivez le changement dans vos mots. Ne collez pas le courriel. Une fois envoyée, la demande est verrouillée; toute modification relance l'approbation.",
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
  podHint: "Les photos sont scellées au téléversement; toute modification ultérieure serait visible.",
  podSaved: "Photo enregistrée.",
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
  messagesHint: "Réservé aux personnes de ce dossier. Les messages sont chiffrés sur votre appareil; SupplyChek ne peut pas les lire.",
  noMessages: "Aucun message pour l’instant.",
  messagePlaceholder: "Écrivez aux personnes de ce dossier…",
  send: "Envoyer",
  sending: "Envoi…",
  lockedMessage: "Ce message ne peut pas être ouvert sur cet appareil. Il a été envoyé avant la configuration de cet appareil, ou vers un appareil utilisé auparavant.",
  noDevices: "Personne d'autre dans ce dossier ne peut encore recevoir de messages. Chaque personne doit ouvrir le dossier une fois.",
  thisDevice: "Cet appareil",
  resetKeys: "Reconfigurer la messagerie sur cet appareil",
  resetKeysConfirm: "Reconfigurer la messagerie sécurisée sur cet appareil? Les messages envoyés avant maintenant ne s'ouvriront plus ici.",
  safetyNumber: "Numéro de sécurité",
  keyChanged: "numéro de sécurité modifié",
  documents: "Documents",
  documentsHint: "Chaque fichier est scellé au téléversement. S'il est modifié par la suite, le téléchargement est bloqué.",
  uploading: "Téléversement…",
  toastSent: "Message envoyé.",
  toastDocSaved: "Document enregistré.",
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
  otherTypeLabel: "Quel est ce document?",
  otherTypeHint: "ex. reçu de carburant, billet de pesée, rapport d’inspection",
  amount: "Montant",
  currency: "Devise",
  download: "Télécharger",
  records: "Registres",
  recordsHint: "Tous les connaissements, factures et reçus au même endroit. Chaque fichier est vérifié avant son téléchargement.",
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
  emptyManager: "Les nouvelles demandes de changement du poste fournisseur s'affichent ici.",
  directoryHint:
    "Numéros déjà au dossier. N’utilisez pas un numéro qui arrive dans une demande.",
  confirmBytes: "Confirmer cette demande",
  signedSoFar: "Approuvé jusqu'ici par",
  nobody: "Personne pour l’instant",
  openPartnerPage: "Ouvrir la page partenaire",
  bytesLocked: "Approuvé",
  bytesLockedBody: "Chaque approbateur a confirmé avec son empreinte, son visage ou le NIP de son appareil. La page partenaire indique qui a approuvé et quand.",
  userVerification: "Confirmé par empreinte, visage ou NIP",
  yes: "Oui",
  no: "Non",
  noPartnerPage: "Pas encore de page partenaire",
  noPartnerPageBody: "La page partenaire apparaît une fois que toutes les personnes requises ont approuvé.",
  backToBoard: "Retour au tableau",
  noRequestOpen: "Aucune demande ouverte",
  pickFromBoard: "Choisissez-en une au bureau de la logistique.",
  serverDown: "Serveur injoignable",
  serverDownBody: "Le service est temporairement indisponible. Réessayez dans un instant.",
  passkeyCreated: "Clé d’accès créée pour ce compte.",
  creatingPasskey: "Création de la clé d’accès…",
  signingIn: "Connexion…",
  counterpartySearch: "Chercher un partenaire par nom, domaine courriel ou ville…",
  noCounterparty: "Aucun partenaire ne correspond.",
  onFileCount: "au dossier",
  pickCounterparty: "Choisir un partenaire",
  noteInOwnWords: "Décrivez le changement dans vos mots. Ne collez ni courriel ni lien.",
  sealPending: "pas encore envoyée",
  sealed: "envoyée et verrouillée",
  sealHint: "Une fois envoyée, la demande est verrouillée. La logistique la vérifie avant toute approbation.",
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
  checkingHash: "Vérification…",
  hashVerified: "Inchangée depuis l'envoi",
  hashMismatch: "Modifiée après l'envoi",
  hashMismatchBody: "Cette demande a été modifiée après l'envoi. Ne l'approuvez pas. Demandez à l'expéditeur de la soumettre de nouveau.",
  canonicalPayload: "Ce qui change",
  approvalProgress: "{done} sur {needed} approuvé(s)",
  twoManagers: "deux approbateurs logistique différents requis",
  ceremonyHint: "Votre clé d'accès approuve exactement ce qui est affiché ici. Si quoi que ce soit change ensuite, cette approbation ne compte plus.",
  jevTitle: "Catégories suggérées",
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
  newRequestHint: "Consignez dans vos mots une demande faite par un partenaire. Un autre approbateur logistique doit l'approuver.",
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
  startFleetSim: "Simuler la flotte",
  stopFleetSim: "Arrêter la simulation",
  fleetHint: "Chaque chauffeur, son temps de conduite et la position de ses chargements. Actualisé toutes les 5 secondes.",
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
  dutyLogHint: "Chaque entrée est horodatée automatiquement et ne peut être ni modifiée ni antidatée. Pour corriger une erreur, ajoutez une note; l'entrée d'origine reste.",
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
  referenceCode: "Code de référence",
  referenceHint: "Lisez ce code à l'autre approbateur ou au partenaire pour confirmer qu'il s'agit de la même demande.",
  technicalDetails: "Détails techniques",
  fullFingerprint: "Empreinte complète de la demande (SHA-256)",
  currentValue: "Au dossier",
  newValue: "Demandé",
  unchanged: "inchangé",
  youApproved: "Vous avez approuvé cette demande",
  youApprovedBody: "Un autre approbateur doit maintenant l'approuver. Vous recevrez une alerte une fois terminé.",
  callRecordLocked: "Le compte rendu d'appel est verrouillé, car cette demande a déjà une approbation.",
  calledBy: "Compte rendu d'appel",
  mailReminder: "Un courriel d'apparence authentique ne prouve pas qu'une demande est réelle. Confirmez en appelant le numéro au dossier.",
  notDelivered: "Ne peut pas encore lire les nouveaux messages (n'a pas ouvert ce dossier)",
  verifyPeople: "Vérifier vos interlocuteurs",
  verifyPeopleHint: "Comparez ces numéros avec chaque personne, en personne ou par téléphone. S'ils correspondent, personne n'intercepte vos messages.",
  flagText: {
    "FREE_EMAIL_DOMAIN": "Envoyé depuis une adresse courriel gratuite ({email})",
    "LOOKALIKE_DOMAIN": "Adresse trompeuse : {domain} imite {onFile}",
    "DOMAIN_NOT_ON_FILE": "Envoyé depuis {domain}, et non depuis l'adresse au dossier ({onFile})",
    "DOMAIN_NOT_ON_FILE_SHORT": "Pas envoyé depuis l'adresse au dossier ({onFile})",
    "HOMOGLYPH": "Utilise des lettres trompeuses d'un autre alphabet",
    "URGENCY_OR_SECRECY": "Vous presse d'agir vite ou de ne pas appeler",
    "PAYMENT_DETAIL_CHANGE": "Demande de changer la destination des paiements",
    "ON_FILE_MISMATCH": "{field} : ne correspond pas au dossier",
    "CREDENTIAL_ASK": "Demande un identifiant, un code ou un lien d'accès",
    "OT_REMOTE_ACCESS": "Demande un accès à distance aux systèmes de l'usine ou de l'entrepôt",
    "NEW_CARRIER": "Présente un transporteur que vous n'avez peut-être jamais utilisé",
    "DESTINATION_OR_DOCK_CHANGE": "Change un quai, une cour ou une adresse de livraison",
    "DOCUMENT_OR_SEAL_CHANGE": "Change un numéro de scellé, un connaissement ou une preuve de livraison",
    "MAIL_AUTH_NOT_CHECKED": "Un courriel d'apparence authentique ne prouve pas qu'une demande est réelle. Confirmez en appelant le numéro au dossier.",
  },
  jevText: {
    "payment-redirection": "Détournement de paiement",
    "urgency": "Pression pour agir vite",
    "carrier-introduction": "Nouveau transporteur",
    "route-change": "Changement d'itinéraire",
    "access-request": "Demande d'accès",
  },
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

/** The field names used in requests, in the reader's language. */
export function fieldTitle(key: string, t: Messages): string {
  const names: Record<string, string> = {
    institution: t.institution,
    transit: t.transit,
    account: t.account,
    dock: t.dock,
    destination: t.destination,
    carrier: t.carrier,
    seal: t.seal,
  };
  return names[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** A warning sign in the reader's language. Unknown legacy text is shown as it was stored. */
export function flagTitle(flag: FlagView, t: Messages): string {
  if (flag.code === "OTHER") return flag.text ?? "";
  const key = flag.code === "DOMAIN_NOT_ON_FILE" && !flag.params.domain ? "DOMAIN_NOT_ON_FILE_SHORT" : flag.code;
  const template = t.flagText[key] ?? flag.code;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name === "field" ? fieldTitle(flag.params.field ?? "", t) : (flag.params[name] ?? ""),
  );
}

export function jevTitle(label: string, t: Messages): string {
  return t.jevText[label] ?? label;
}

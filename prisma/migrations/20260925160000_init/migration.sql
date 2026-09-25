-- CreateEnum
CREATE TYPE "Role" AS ENUM ('supplier', 'manager', 'driver', 'receiver', 'admin');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('draft', 'flagged', 'oob_pending', 'pending_approval', 'pending_second', 'fully_approved', 'rejected', 'revoked');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('bank_change', 'destination_change', 'credential_request', 'new_carrier', 'ot_remote', 'first_order_credit', 'truck_status_update', 'schedule_only', 'bol_pod_alter');

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "clerkId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "numberOnFile" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "aaguid" TEXT,
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryContact" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "seedKey" TEXT,
    "name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "numberOnFile" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "bankOnFile" JSONB,
    "dockOnFile" TEXT,
    "carrierOnFile" TEXT,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectoryContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPortalAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerPortalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifyCase" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "seedKey" TEXT,
    "createdById" TEXT NOT NULL,
    "contactId" TEXT,
    "requestType" "RequestType" NOT NULL,
    "counterparty" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "onFileJson" JSONB NOT NULL,
    "requestedJson" JSONB NOT NULL,
    "flagsJson" JSONB NOT NULL,
    "oobStepsJson" JSONB NOT NULL,
    "oobAckJson" JSONB,
    "payloadCanonical" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL,
    "dualControl" BOOLEAN NOT NULL,
    "matchesUploaded" BOOLEAN NOT NULL DEFAULT false,
    "publicToken" TEXT,
    "revokedAt" TIMESTAMP(3),
    "jevJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerifyCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifyDecision" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifyDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingCeremony" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingCeremony_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAttestation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "clientDataJSON" TEXT NOT NULL,
    "authenticatorData" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "aaguid" TEXT,
    "signCount" INTEGER NOT NULL,
    "uv" BOOLEAN NOT NULL,
    "assertionHash" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "peerAttestationId" TEXT,

    CONSTRAINT "ApprovalAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifyReceipt" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "jws" TEXT NOT NULL,
    "jwksKid" TEXT NOT NULL,
    "claimsJson" JSONB NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifyReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceAsset" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT,
    "loadId" TEXT,
    "r2Key" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "trailer" TEXT NOT NULL,
    "carrierName" TEXT NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "seedKey" TEXT,
    "truckId" TEXT,
    "loadRef" TEXT NOT NULL,
    "carrierName" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "trailer" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "lastKnown" TEXT NOT NULL,
    "reeferSetpoint" TEXT,
    "sealNumber" TEXT,
    "scheduledDock" TEXT,
    "approvedDock" TEXT,
    "approvedDestination" TEXT,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "eta" TIMESTAMP(3),
    "payloadHashOfLastApprovedChange" TEXT,
    "driverUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "rawNote" TEXT,
    "evidenceAssetIds" TEXT[],
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalAttestationIds" TEXT[],
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "seedKey" TEXT,
    "userId" TEXT,
    "role" "Role",
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "emailTo" TEXT,
    "emailStatus" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxConnection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mailbox" TEXT NOT NULL,
    "tokenCipher" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailboxConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "caseId" TEXT,
    "userId" TEXT NOT NULL,
    "numberOnFile" TEXT NOT NULL,
    "spokeWith" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Org_slug_key" ON "Org"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_orgId_email_key" ON "User"("orgId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "WebAuthnCredential_credentialId_key" ON "WebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "WebAuthnChallenge_userId_kind_idx" ON "WebAuthnChallenge"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryContact_seedKey_key" ON "DirectoryContact"("seedKey");

-- CreateIndex
CREATE INDEX "DirectoryContact_orgId_idx" ON "DirectoryContact"("orgId");

-- CreateIndex
CREATE INDEX "PartnerPortalAccount_orgId_idx" ON "PartnerPortalAccount"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifyCase_seedKey_key" ON "VerifyCase"("seedKey");

-- CreateIndex
CREATE UNIQUE INDEX "VerifyCase_publicToken_key" ON "VerifyCase"("publicToken");

-- CreateIndex
CREATE INDEX "VerifyCase_orgId_status_idx" ON "VerifyCase"("orgId", "status");

-- CreateIndex
CREATE INDEX "VerifyDecision_orgId_caseId_idx" ON "VerifyDecision"("orgId", "caseId");

-- CreateIndex
CREATE INDEX "PendingCeremony_orgId_caseId_userId_idx" ON "PendingCeremony"("orgId", "caseId", "userId");

-- CreateIndex
CREATE INDEX "ApprovalAttestation_orgId_caseId_payloadHash_idx" ON "ApprovalAttestation"("orgId", "caseId", "payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "VerifyReceipt_token_key" ON "VerifyReceipt"("token");

-- CreateIndex
CREATE INDEX "VerifyReceipt_orgId_caseId_idx" ON "VerifyReceipt"("orgId", "caseId");

-- CreateIndex
CREATE INDEX "EvidenceAsset_orgId_idx" ON "EvidenceAsset"("orgId");

-- CreateIndex
CREATE INDEX "Truck_orgId_idx" ON "Truck"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Load_seedKey_key" ON "Load"("seedKey");

-- CreateIndex
CREATE INDEX "Load_orgId_idx" ON "Load"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Load_orgId_loadRef_key" ON "Load"("orgId", "loadRef");

-- CreateIndex
CREATE INDEX "TrackingEvent_orgId_loadId_idx" ON "TrackingEvent"("orgId", "loadId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_seedKey_key" ON "Notification"("seedKey");

-- CreateIndex
CREATE INDEX "Notification_orgId_userId_idx" ON "Notification"("orgId", "userId");

-- CreateIndex
CREATE INDEX "MailboxConnection_orgId_idx" ON "MailboxConnection"("orgId");

-- CreateIndex
CREATE INDEX "CallLog_orgId_idx" ON "CallLog"("orgId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAuthnCredential" ADD CONSTRAINT "WebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryContact" ADD CONSTRAINT "DirectoryContact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPortalAccount" ADD CONSTRAINT "PartnerPortalAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifyCase" ADD CONSTRAINT "VerifyCase_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifyCase" ADD CONSTRAINT "VerifyCase_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "DirectoryContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifyDecision" ADD CONSTRAINT "VerifyDecision_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerifyCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifyDecision" ADD CONSTRAINT "VerifyDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingCeremony" ADD CONSTRAINT "PendingCeremony_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerifyCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingCeremony" ADD CONSTRAINT "PendingCeremony_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAttestation" ADD CONSTRAINT "ApprovalAttestation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerifyCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAttestation" ADD CONSTRAINT "ApprovalAttestation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifyReceipt" ADD CONSTRAINT "VerifyReceipt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "VerifyCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceAsset" ADD CONSTRAINT "EvidenceAsset_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxConnection" ADD CONSTRAINT "MailboxConnection_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Immutable audit rows: append-only VerifyDecision and ApprovalAttestation
CREATE RULE "VerifyDecision_no_update" AS ON UPDATE TO "VerifyDecision" DO INSTEAD NOTHING;
CREATE RULE "VerifyDecision_no_delete" AS ON DELETE TO "VerifyDecision" DO INSTEAD NOTHING;
CREATE RULE "ApprovalAttestation_no_update" AS ON UPDATE TO "ApprovalAttestation" DO INSTEAD NOTHING;
CREATE RULE "ApprovalAttestation_no_delete" AS ON DELETE TO "ApprovalAttestation" DO INSTEAD NOTHING;


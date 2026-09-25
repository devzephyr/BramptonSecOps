"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DriverDesk } from "@/components/desk/driver-desk";
import { ManagerDesk } from "@/components/desk/manager-desk";
import { ReceiverDesk } from "@/components/desk/receiver-desk";
import { DeskShell } from "@/components/desk/shell";
import { SupplierDesk } from "@/components/desk/supplier-desk";
import type { SessionUser } from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import type { Note, Role } from "@/preview/data";
import { StoreProvider, useDesk } from "@/preview/store";

function noteForRole(note: Note, role: Role) {
  const audience = Array.isArray(note.audience) ? note.audience : [];
  return audience.includes(role);
}

function DeskBody() {
  const desk = useDesk();
  const { t } = useI18n();
  const role = desk.user.role as Role;
  const warning = desk.notes.find(
    (note) => note.title.startsWith("Driver is 15") && noteForRole(note, role),
  );

  return (
    <>
      {warning && (role === "manager" || role === "receiver" || role === "admin") && (
        <Alert variant="warning">
          <AlertTitle>{t.warning}</AlertTitle>
          <AlertDescription>{warning.body}</AlertDescription>
        </Alert>
      )}
      {role === "supplier" && <SupplierDesk />}
      {(role === "manager" || role === "admin") && <ManagerDesk />}
      {role === "driver" && <DriverDesk />}
      {role === "receiver" && <ReceiverDesk />}
    </>
  );
}

function RoleDeskInner({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const desk = useDesk();
  const role = desk.user.role as Role;
  const alertCount = desk.notes.filter((note) => noteForRole(note, role) && !note.read).length;

  return (
    <DeskShell user={user} alertCount={alertCount} onSignOut={onSignOut}>
      <DeskBody />
    </DeskShell>
  );
}

export function RoleDesk({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  return (
    <StoreProvider user={user}>
      <RoleDeskInner user={user} onSignOut={onSignOut} />
    </StoreProvider>
  );
}

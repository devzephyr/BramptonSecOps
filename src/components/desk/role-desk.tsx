"use client";

import { useEffect } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DriverDesk } from "@/components/desk/driver-desk";
import { ManagerDesk } from "@/components/desk/manager-desk";
import { ReceiverDesk } from "@/components/desk/receiver-desk";
import { DeskShell } from "@/components/desk/shell";
import { SupplierDesk } from "@/components/desk/supplier-desk";
import type { SessionUser } from "@/lib/desk-client";
import { roleTitle, useI18n } from "@/lib/i18n";
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
  const unread = desk.notes.filter((note) => !note.read && noteForRole(note, role)).slice(0, 3);

  return (
    <>
      {unread.map((note) => (
        <Alert key={note.id} variant={note.kind === "load_fifteen_min" ? "warning" : "info"}>
          <AlertTitle>{note.title}</AlertTitle>
          <AlertDescription>{note.body}</AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline" onClick={() => void desk.dismissNote(note.id)}>
              {t.dismiss}
            </Button>
          </AlertAction>
        </Alert>
      ))}
      {role === "supplier" && <SupplierDesk />}
      {(role === "manager" || role === "admin") && <ManagerDesk />}
      {role === "driver" && <DriverDesk />}
      {role === "receiver" && <ReceiverDesk />}
    </>
  );
}

function RoleDeskInner({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const desk = useDesk();
  const { t } = useI18n();
  const role = desk.user.role as Role;
  const alertCount = desk.notes.filter((note) => noteForRole(note, role) && !note.read).length;

  useEffect(() => {
    document.title = `${roleTitle(role, t)} · ${t.brand}`;
  }, [role, t]);

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

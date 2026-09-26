"use client";

import { useEffect } from "react";
import { DriverDesk } from "@/components/desk/driver-desk";
import { LogisticsDesk } from "@/components/desk/logistics-desk";
import { WarehouseDesk } from "@/components/desk/warehouse-desk";
import { ReceiverDesk } from "@/components/desk/receiver-desk";
import { DeskShell } from "@/components/desk/shell";
import { SupplierDesk } from "@/components/desk/supplier-desk";
import type { SessionUser } from "@/lib/desk-client";
import { roleTitle, useI18n } from "@/lib/i18n";
import type { Role } from "@/preview/data";
import { StoreProvider, useDesk } from "@/preview/store";

function DeskBody() {
  const desk = useDesk();
  const role = desk.user.role as Role;

  return (
    <>
      {role === "supplier" && <SupplierDesk />}
      {(role === "admin" || role === "logistics") && <LogisticsDesk />}
      {role === "driver" && <DriverDesk />}
      {role === "receiver" && <ReceiverDesk />}
      {role === "warehouse" && <WarehouseDesk />}
    </>
  );
}

function RoleDeskInner({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const desk = useDesk();
  const { t } = useI18n();
  const role = desk.user.role as Role;

  useEffect(() => {
    document.title = `${roleTitle(role, t)} · ${t.brand}`;
  }, [role, t]);

  return (
    <DeskShell user={user} onSignOut={onSignOut}>
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

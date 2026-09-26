"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleDesk } from "@/components/desk/role-desk";
import { SignInScreen } from "@/components/desk/sign-in";
import { GateLoading } from "@/components/desk/gate-loading";
import { fetchSession, signOutSession, type SessionUser } from "@/lib/desk-client";
import { I18nProvider } from "@/lib/i18n";

function ManagerPageInner() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    void fetchSession()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const signOut = useCallback(async () => {
    await signOutSession();
    window.location.assign("/sign-in");
  }, []);

  if (user === undefined) return <GateLoading />;
  if (!user) return <SignInScreen onSignedIn={() => void fetchSession().then(setUser).catch(() => setUser(null))} />;
  if (user.role !== "manager" && user.role !== "admin") {
    window.location.assign("/sign-in");
    return null;
  }

  return <RoleDesk user={user} onSignOut={() => void signOut()} />;
}

export default function ManagerPage() {
  return (
    <I18nProvider>
      <ManagerPageInner />
    </I18nProvider>
  );
}

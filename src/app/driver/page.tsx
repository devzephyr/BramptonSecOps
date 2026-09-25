"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleDesk } from "@/components/desk/role-desk";
import { SignInScreen } from "@/components/desk/sign-in";
import { fetchSession, signOutSession, type SessionUser } from "@/lib/desk-client";
import { I18nProvider } from "@/lib/i18n";

function DriverPageInner() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    void fetchSession().then(setUser);
  }, []);

  const signOut = useCallback(async () => {
    await signOutSession();
    // Full reload, not router.replace: the session is gone and the
    // Next 16/Turbopack Flight stream crashes on client-side nav here.
    window.location.assign("/sign-in");
  }, []);

  if (user === undefined) return null;
  if (!user) return <SignInScreen onSignedIn={() => void fetchSession().then(setUser)} />;
  if (user.role !== "driver") {
    window.location.assign("/sign-in");
    return null;
  }

  return <RoleDesk user={user} onSignOut={() => void signOut()} />;
}

export default function DriverPage() {
  return (
    <I18nProvider>
      <DriverPageInner />
    </I18nProvider>
  );
}

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { roleHome } from "@/components/desk/app-gate";
import { GateLoading } from "@/components/desk/gate-loading";
import { RoleDesk } from "@/components/desk/role-desk";
import { SignInScreen } from "@/components/desk/sign-in";
import { fetchSession, signOutSession, type SessionUser } from "@/lib/desk-client";
import { I18nProvider } from "@/lib/i18n";

type RenderDesk = (user: SessionUser, signOut: () => void) => ReactNode;

function RolePageInner({ roles, render }: { roles: string[]; render?: RenderDesk }) {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  const load = useCallback(() => {
    void fetchSession()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(load, [load]);

  const allowed = user ? roles.includes(user.role) : false;
  useEffect(() => {
    if (user && !allowed) window.location.replace(roleHome(user.role));
  }, [allowed, user]);

  const signOut = useCallback(() => {
    void signOutSession().finally(() => window.location.assign("/sign-in"));
  }, []);

  if (user === undefined || (user && !allowed)) return <GateLoading />;
  if (!user) return <SignInScreen onSignedIn={load} />;
  return render ? render(user, signOut) : <RoleDesk user={user} onSignOut={signOut} />;
}

export function RolePage({ roles, render }: { roles: string[]; render?: RenderDesk }) {
  return (
    <I18nProvider>
      <RolePageInner roles={roles} render={render} />
    </I18nProvider>
  );
}

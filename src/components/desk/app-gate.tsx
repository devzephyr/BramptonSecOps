"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleDesk } from "@/components/desk/role-desk";
import { SignInScreen } from "@/components/desk/sign-in";
import { GateLoading } from "@/components/desk/gate-loading";
import { DeskApiError, fetchSession, isServerUnavailable, signOutSession, type SessionUser } from "@/lib/desk-client";

function roleHome(role: string) {
  switch (role) {
    case "supplier":
      return "/supplier";
    case "manager":
    case "admin":
      return "/manager";
    case "driver":
      return "/driver";
    case "receiver":
      return "/receiver";
    default:
      return "/sign-in";
  }
}

export function AppGate() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const session = await fetchSession();
      setUser(session);
    } catch (err) {
      if (err instanceof DeskApiError && isServerUnavailable(err.status)) {
        setUser(null);
      } else {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (window.location.pathname === "/sign-in") {
      window.location.assign(roleHome(user.role));
    }
  }, [user]);

  const signOut = useCallback(async () => {
    await signOutSession();
    setUser(null);
  }, []);

  if (user === undefined) {
    return <GateLoading />;
  }

  if (!user) {
    return <SignInScreen onSignedIn={() => void refresh()} />;
  }

  return <RoleDesk user={user} onSignOut={() => void signOut()} />;
}

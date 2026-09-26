"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleDesk } from "@/components/desk/role-desk";
import { SignInScreen } from "@/components/desk/sign-in";
import { GateLoading } from "@/components/desk/gate-loading";
import { fetchSession, signOutSession, type SessionUser } from "@/lib/desk-client";

export function roleHome(role: string) {
  switch (role) {
    case "supplier":
      return "/supplier";
    case "manager":
    case "admin":
    case "logistics":
      return "/manager";
    case "driver":
      return "/driver";
    case "receiver":
    case "warehouse":
      return "/receiver";
    default:
      return "/sign-in";
  }
}

export function AppGate() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchSession());
    } catch {
      setUser(null);
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

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/desk-client";
import { roleTitle, useI18n } from "@/lib/i18n";

export function DeskShell({
  user,
  alertCount,
  onSignOut,
  children,
}: {
  user: SessionUser;
  alertCount: number;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto min-w-0">
            <p className="font-heading text-xl font-semibold">{t.brand}</p>
            <p className="text-xs text-muted-foreground">{t.place}</p>
            <p className="text-xs text-muted-foreground">
              {user.orgName ?? t.demoOrg}
              {" · "}
              {t.signedInAs} {user.name} · {roleTitle(user.role, t)}
            </p>
          </div>
          <Button size="sm" variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
            EN
          </Button>
          <Button size="sm" variant={lang === "fr" ? "default" : "outline"} onClick={() => setLang("fr")}>
            FR
          </Button>
          <Badge variant={alertCount ? "warning" : "outline"}>
            {alertCount} {t.alerts}
          </Badge>
          <Button size="sm" variant="outline" onClick={onSignOut}>
            {t.signOut}
          </Button>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5">{children}</main>
    </div>
  );
}

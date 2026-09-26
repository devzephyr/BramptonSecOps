"use client";

import { Button } from "@/components/ui/button";
import { NotificationsMenu } from "@/components/desk/notifications-menu";
import { ThemeToggle } from "@/components/desk/theme-toggle";
import type { SessionUser } from "@/lib/desk-client";
import { roleTitle, useI18n } from "@/lib/i18n";

export function DeskShell({
  user,
  onSignOut,
  children,
}: {
  user: SessionUser;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#desk-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        {t.skipToContent}
      </a>
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
          <ThemeToggle />
          <NotificationsMenu />
          <Button size="sm" variant="outline" onClick={onSignOut}>
            {t.signOut}
          </Button>
        </div>
      </header>
      <main id="desk-content" className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5">{children}</main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/desk/theme-toggle";
import {
  createOrg,
  createPasskey,
  DeskApiError,
  isServerUnavailable,
  signInWithPasskey,
} from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";

export function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const { lang, setLang, t } = useI18n();
  const [username, setUsername] = useState("");
  const [org, setOrg] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "sign-in" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverDown, setServerDown] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [fullName, setFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [signupBusy, setSignupBusy] = useState(false);

  useEffect(() => {
    document.title = `${t.signIn} · ${t.brand}`;
  }, [t]);

  function identity() {
    const base = { username: username.trim(), org: org.trim() };
    return code.trim() ? { ...base, enrollmentToken: code.trim() } : base;
  }

  function ready() {
    return username.trim().length > 0 && org.trim().length > 0;
  }

  async function signup() {
    if (signupBusy) return;
    setError(null);
    setNotice(null);
    if (!orgName.trim() || !fullName.trim() || !newUsername.trim()) {
      setError(t.identityRequired);
      return;
    }
    setSignupBusy(true);
    try {
      const created = await createOrg({
        name: orgName.trim(),
        city: city.trim(),
        province: province.trim(),
        displayName: fullName.trim(),
        username: newUsername.trim(),
      });
      setUsername(created.username);
      setOrg(created.org.slug);
      setShowSignup(false);
      setNotice(`${t.orgCreated} (${created.org.slug} · ${created.username}) ${t.enrollmentCode}: ${created.enrollmentToken}`);
    } catch (err) {
      if (err instanceof DeskApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : t.passkeyStopped);
    } finally {
      setSignupBusy(false);
    }
  }

  async function run(kind: "create" | "sign-in") {
    setError(null);
    setNotice(null);
    setServerDown(false);
    if (!ready()) {
      setError(t.identityRequired);
      return;
    }
    setBusy(kind);
    try {
      if (kind === "create") {
        await createPasskey(identity());
        setNotice(t.passkeyCreated);
      } else {
        await signInWithPasskey(identity());
        onSignedIn();
      }
    } catch (err) {
      if (err instanceof DeskApiError && isServerUnavailable(err.status)) {
        setServerDown(true);
      } else {
        const message = err instanceof Error ? err.message : t.passkeyStopped;
        setError(message);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#signin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        {t.skipToContent}
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto">
            <p className="font-heading text-xl font-semibold">{t.brand}</p>
            <p className="text-xs text-muted-foreground">{t.noSession}</p>
          </div>
          <Button size="sm" variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
            EN
          </Button>
          <Button size="sm" variant={lang === "fr" ? "default" : "outline"} onClick={() => setLang("fr")}>
            FR
          </Button>
          <ThemeToggle />
        </div>
      </header>
      <main id="signin-content" className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t.signIn}</CardTitle>
            <CardDescription>{t.accountHint}</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-3">
            {serverDown && (
              <Alert variant="error">
                <AlertTitle>{t.serverDown}</AlertTitle>
                <AlertDescription>{t.serverDownBody}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="error">
                <AlertTitle>{t.passkeyStopped}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {notice && (
              <Alert variant="success">
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="si-username">
                {t.username}
              </label>
              <Input
                id="si-username"
                autoComplete="username"
                placeholder={t.usernamePlaceholder}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="si-org">
                {t.orgLabel}
              </label>
              <Input
                id="si-org"
                autoComplete="organization"
                placeholder={t.orgPlaceholder}
                value={org}
                onChange={(event) => setOrg(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="si-code">
                {t.enrollmentCode}
              </label>
              <Input
                id="si-code"
                autoComplete="off"
                placeholder={t.enrollmentCodeHint}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy !== null} onClick={() => void run("sign-in")}>
                {busy === "sign-in" ? t.signingIn : t.signInWithPasskey}
              </Button>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => void run("create")}
              >
                {busy === "create" ? t.creatingPasskey : t.createPasskey}
              </Button>
              <Button variant="ghost" onClick={() => setShowSignup((value) => !value)}>
                {t.createOrg}
              </Button>
            </div>
          </CardPanel>
        </Card>
        {showSignup && (
          <Card>
            <CardHeader>
              <CardTitle>{t.createOrg}</CardTitle>
              <CardDescription>{t.newOrgHint}</CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="su-org">
                  {t.orgName}
                </label>
                <Input
                  id="su-org"
                  autoComplete="organization"
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="su-city">
                    {t.city}
                  </label>
                  <Input
                    id="su-city"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="su-province">
                    {t.province}
                  </label>
                  <Input
                    id="su-province"
                    autoComplete="address-level1"
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="su-name">
                  {t.yourName}
                </label>
                <Input
                  id="su-name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" htmlFor="su-username">
                  {t.username}
                </label>
                <Input
                  id="su-username"
                  autoComplete="username"
                  placeholder={t.usernamePlaceholder}
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                />
              </div>
              <div>
                <Button disabled={signupBusy} onClick={() => void signup()}>
                  {t.createOrg}
                </Button>
              </div>
            </CardPanel>
          </Card>
        )}
      </main>
    </div>
  );
}

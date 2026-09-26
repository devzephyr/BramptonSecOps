"use client";

import { KeyRoundIcon } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { CopyButton } from "@/components/desk/copy-button";
import { ThemeToggle } from "@/components/desk/theme-toggle";
import {
  createOrg,
  createPasskey,
  DeskApiError,
  isServerUnavailable,
  signInWithPasskey,
} from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";

type Mode = "sign-in" | "first-time" | "new-org";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** What an approved change looks like: the thing SupplyChek produces, shown instead of a slogan. */
function ReceiptPreview() {
  const { t } = useI18n();
  const row = (label: string, value: ReactNode) => (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
  return (
    <figure className="relative w-full max-w-sm rounded-xl border bg-card p-6 font-mono text-xs shadow-sm">
      <figcaption className="mb-4 text-[0.7rem] tracking-[0.2em] text-muted-foreground uppercase">
        {t.receiptTitle}
      </figcaption>
      <p className="mb-4 font-sans text-base font-semibold">{t.receiptChange}</p>
      <div className="flex flex-col gap-2 border-y border-dashed py-4">
        {row(t.receiptOnFile, "•••• 1290")}
        {row(t.receiptRequested, "•••• 8211")}
      </div>
      <div className="flex flex-col gap-2 border-b border-dashed py-4">
        {row(t.receiptApprovals, "2 / 2")}
        {row("", "Amira Shah")}
        {row("", "Colin Berger")}
      </div>
      <div className="flex flex-col gap-2 pt-4">
        {row("sha256", "3f9a2c…d41e07")}
        {row(t.receiptSignature, "Ed25519")}
      </div>
      <span
        aria-hidden
        className="absolute top-4 right-5 rotate-6 rounded-md border-2 border-success px-2 py-1 font-sans text-sm font-bold tracking-wider text-success uppercase opacity-80"
      >
        {t.receiptStamp}
      </span>
    </figure>
  );
}

export function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const { lang, setLang, t } = useI18n();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [username, setUsername] = useState("");
  const [org, setOrg] = useState("");
  const [code, setCode] = useState("");
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverDown, setServerDown] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [fullName, setFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    document.title = `${t.signIn} · ${t.brand}`;
  }, [t]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setServerDown(false);
    if (next !== "first-time") setIssuedCode(null);
  }

  function fail(err: unknown) {
    if (
      (err instanceof DeskApiError && isServerUnavailable(err.status)) ||
      (err instanceof TypeError && /fetch/i.test(err.message))
    ) {
      setServerDown(true);
    } else {
      setError(err instanceof Error ? err.message : t.passkeyStopped);
    }
  }

  async function submitSignIn(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    setServerDown(false);
    if (!username.trim() || !org.trim()) {
      setError(t.identityRequired);
      return;
    }
    setBusy("sign-in");
    try {
      await signInWithPasskey({ username: username.trim(), org: org.trim() });
      onSignedIn();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function submitFirstTime(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    setServerDown(false);
    if (!username.trim() || !org.trim() || !code.trim()) {
      setError(t.firstTimeRequired);
      return;
    }
    setBusy("first-time");
    try {
      await createPasskey({ username: username.trim(), org: org.trim(), enrollmentToken: code.trim() });
      setCode("");
      setIssuedCode(null);
      setMode("sign-in");
      setNotice(t.passkeyCreated);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function submitNewOrg(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    setServerDown(false);
    if (!orgName.trim() || !fullName.trim() || !newUsername.trim()) {
      setError(t.newOrgRequired);
      return;
    }
    setBusy("new-org");
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
      setCode(created.enrollmentToken);
      setIssuedCode(created.enrollmentToken);
      setMode("first-time");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  const identityFields = (prefix: string) => (
    <>
      <Field id={`${prefix}-username`} label={t.username}>
        <Input
          id={`${prefix}-username`}
          autoComplete="username"
          placeholder={t.usernamePlaceholder}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </Field>
      <Field id={`${prefix}-org`} label={t.orgLabel}>
        <Input
          id={`${prefix}-org`}
          autoComplete="organization"
          placeholder={t.orgPlaceholder}
          value={org}
          onChange={(event) => setOrg(event.target.value)}
        />
      </Field>
    </>
  );

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <a
        href="#signin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        {t.skipToContent}
      </a>

      <aside className="hidden flex-col justify-between gap-10 border-r bg-muted/60 p-10 lg:flex">
        <div>
          <p className="font-heading text-2xl font-semibold">{t.brand}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.place}</p>
        </div>
        <div className="flex flex-col items-start gap-5">
          <ReceiptPreview />
          <p className="max-w-sm text-sm text-muted-foreground">{t.receiptCaption}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t.notGov}</p>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center gap-2 px-6 py-4">
          <p className="mr-auto font-heading text-lg font-semibold lg:invisible">{t.brand}</p>
          <Button size="sm" variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
            EN
          </Button>
          <Button size="sm" variant={lang === "fr" ? "default" : "outline"} onClick={() => setLang("fr")}>
            FR
          </Button>
          <ThemeToggle />
        </header>

        <main id="signin-content" className="flex flex-1 items-start justify-center px-6 pt-6 pb-12 lg:items-center lg:pt-0">
          <div className="flex w-full max-w-sm flex-col gap-6">
            <Tabs value={mode} onValueChange={(value) => switchMode(value as Mode)}>
              <TabsList className="w-full">
                <TabsTab value="sign-in" className="flex-1">
                  {t.signIn}
                </TabsTab>
                <TabsTab value="first-time" className="flex-1">
                  {t.firstTime}
                </TabsTab>
                <TabsTab value="new-org" className="flex-1">
                  {t.newOrgTab}
                </TabsTab>
              </TabsList>

              {(serverDown || error || notice) && (
                <div className="pt-5">
                  {serverDown && (
                    <Alert variant="error">
                      <AlertTitle>{t.serverDown}</AlertTitle>
                      <AlertDescription>{t.serverDownBody}</AlertDescription>
                    </Alert>
                  )}
                  {error && (
                    <Alert variant="error">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {notice && (
                    <Alert variant="success">
                      <AlertDescription>{notice}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <TabsPanel value="sign-in" className="pt-6">
                <form className="flex flex-col gap-4" onSubmit={(event) => void submitSignIn(event)}>
                  <div>
                    <h1 className="font-heading text-2xl font-semibold">{t.signIn}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t.accountHint}</p>
                  </div>
                  {identityFields("si")}
                  <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
                    <KeyRoundIcon aria-hidden />
                    {busy === "sign-in" ? t.signingIn : t.signInWithPasskey}
                  </Button>
                </form>
              </TabsPanel>

              <TabsPanel value="first-time" className="pt-6">
                <form className="flex flex-col gap-4" onSubmit={(event) => void submitFirstTime(event)}>
                  <div>
                    <h1 className="font-heading text-2xl font-semibold">{t.firstTime}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t.firstTimeHint}</p>
                  </div>
                  {issuedCode && (
                    <div className="rounded-lg border border-success/40 bg-success/8 p-4">
                      <p className="text-sm font-medium">{t.orgReady}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t.orgReadyBody}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <code className="font-mono text-lg font-semibold tracking-widest">{issuedCode}</code>
                        <CopyButton text={issuedCode} label={t.enrollmentCode} />
                      </div>
                    </div>
                  )}
                  {identityFields("ft")}
                  <Field id="ft-code" label={t.enrollmentCode}>
                    <Input
                      id="ft-code"
                      autoComplete="one-time-code"
                      placeholder="ABCD-EFGH-JKLM"
                      className="font-mono tracking-wider"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
                    <KeyRoundIcon aria-hidden />
                    {busy === "first-time" ? t.creatingPasskey : t.createPasskey}
                  </Button>
                </form>
              </TabsPanel>

              <TabsPanel value="new-org" className="pt-6">
                <form className="flex flex-col gap-4" onSubmit={(event) => void submitNewOrg(event)}>
                  <div>
                    <h1 className="font-heading text-2xl font-semibold">{t.createOrg}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t.newOrgHint}</p>
                  </div>
                  <Field id="su-org" label={t.orgName}>
                    <Input
                      id="su-org"
                      autoComplete="organization"
                      value={orgName}
                      onChange={(event) => setOrgName(event.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="su-city" label={t.city}>
                      <Input
                        id="su-city"
                        autoComplete="address-level2"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                      />
                    </Field>
                    <Field id="su-province" label={t.province}>
                      <Input
                        id="su-province"
                        autoComplete="address-level1"
                        placeholder="ON"
                        value={province}
                        onChange={(event) => setProvince(event.target.value)}
                      />
                    </Field>
                  </div>
                  <Field id="su-name" label={t.yourName}>
                    <Input
                      id="su-name"
                      autoComplete="name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                    />
                  </Field>
                  <Field id="su-username" label={t.username}>
                    <Input
                      id="su-username"
                      autoComplete="username"
                      placeholder={t.usernamePlaceholder}
                      value={newUsername}
                      onChange={(event) => setNewUsername(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
                    {t.createOrg}
                  </Button>
                </form>
              </TabsPanel>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

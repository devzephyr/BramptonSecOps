"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeskApiError, addTeammate, fetchCredentials, fetchTeam, issueEnrollmentCode, revokeCredential, type MemberCredential, type TeamMember } from "@/lib/desk-client";
import { roleTitle, useI18n } from "@/lib/i18n";

const ROLES = ["supplier", "manager", "driver", "receiver", "admin"];

export function TeamDesk() {
  const { t } = useI18n();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("supplier");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creds, setCreds] = useState<Record<string, MemberCredential[]>>({});
  const [issued, setIssued] = useState<{ username: string | null; code: string } | null>(null);

  async function issue(member: Pick<TeamMember, "id">) {
    setError(null);
    setIssued(null);
    try {
      setIssued(await issueEnrollmentCode(member.id));
    } catch (err) {
      if (err instanceof DeskApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Could not issue code.");
    }
  }

  const refresh = useCallback(async () => {
    setTeam(await fetchTeam());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggleKeys(member: TeamMember) {
    if (openId === member.id) {
      setOpenId(null);
      return;
    }
    setOpenId(member.id);
    if (!creds[member.id]) {
      setCreds((current) => ({ ...current, [member.id]: [] }));
      const rows = await fetchCredentials(member.id);
      setCreds((current) => ({ ...current, [member.id]: rows }));
    }
  }

  async function revoke(member: TeamMember, credentialId: string) {
    if (!window.confirm(t.revokeConfirm)) return;
    try {
      await revokeCredential(member.id, credentialId);
      setCreds((current) => ({
        ...current,
        [member.id]: (current[member.id] ?? []).filter((row) => row.id !== credentialId),
      }));
      await refresh();
    } catch (err) {
      if (err instanceof DeskApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Could not revoke credential.");
    }
  }

  async function add() {
    if (busy) return;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    setIssued(null);
    try {
      const created = await addTeammate({ username: username.trim(), name: name.trim(), role });
      setUsername("");
      setName("");
      setNotice(`${t.teammateAdded} ${created.username}`);
      await refresh();
      await issue(created);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add teammate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.team}</CardTitle>
          <CardDescription>{t.teamHint}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {issued && (
            <Alert variant="success">
              <AlertDescription>
                {t.codeIssued} <span className="font-mono">{issued.code}</span>
                {issued.username ? ` (${issued.username})` : ""}
              </AlertDescription>
            </Alert>
          )}
          <div className="overflow-x-auto">
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>{t.username}</TableHead>
                <TableHead>{t.fullName}</TableHead>
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.encryption}</TableHead>
                <TableHead>{t.passkeys}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <Fragment key={member.id}>
                  <TableRow>
                    <TableCell className="font-mono text-xs">{member.username ?? "—"}</TableCell>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleTitle(member.role, t)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.hasKeys ? "success" : "warning"}>
                        {member.hasKeys ? t.keysReady : t.noKeys}
                        {member.devices > 1 ? ` · ${member.devices}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void toggleKeys(member)}>
                          {t.passkeys}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void issue(member)}>
                          {t.issueCode}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {openId === member.id && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        {(creds[member.id] ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t.noCredentials}</p>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {(creds[member.id] ?? []).map((cred) => (
                              <li key={cred.id} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-mono text-xs">
                                  {new Date(cred.createdAt).toLocaleDateString("en-CA")}
                                </span>
                                {cred.deviceType && (
                                  <span className="text-xs text-muted-foreground">{cred.deviceType}</span>
                                )}
                                {cred.backedUp && (
                                  <Badge variant="outline">{t.synced}</Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void revoke(member, cred.id)}
                                >
                                  {t.revoke}
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardPanel>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.addTeammate}</CardTitle>
          <CardDescription>{t.addTeammateHint}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          {formError && (
            <Alert variant="error">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {notice && (
            <Alert variant="success">
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="tm-username">
                {t.username}
              </label>
              <Input
                id="tm-username"
                autoComplete="off"
                placeholder={t.usernamePlaceholder}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="tm-name">
                {t.fullName}
              </label>
              <Input
                id="tm-name"
                autoComplete="off"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{t.role}</span>
              <Select value={role} onValueChange={(value) => setRole(String(value))}>
                <SelectTrigger>
                  <SelectValue>{(value) => roleTitle(String(value), t)}</SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {ROLES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {roleTitle(item, t)}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </div>
          <div>
            <Button size="sm" disabled={busy} onClick={() => void add()}>
              {t.addTeammate}
            </Button>
          </div>
        </CardPanel>
      </Card>
    </div>
  );
}

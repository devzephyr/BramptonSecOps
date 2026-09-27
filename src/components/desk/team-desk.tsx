"use client";

import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeskApiError, addTeammate, fetchCredentials, fetchTeam, issueEnrollmentCode, revokeCredential, updateTeammate, type MemberCredential, type TeamMember } from "@/lib/desk-client";
import { roleTitle, useI18n } from "@/lib/i18n";
import { JOB_TITLES, type Role } from "@/preview/data";
import { useDesk } from "@/preview/store";

const ROLES = ["supplier", "logistics", "warehouse", "driver", "receiver", "admin"];

function TitleInput({
  id,
  role,
  value,
  onChange,
}: {
  id: string;
  role: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <Input
        id={id}
        list={`${id}-options`}
        autoComplete="off"
        maxLength={80}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={`${id}-options`}>
        {(JOB_TITLES[role as Role] ?? []).map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}

function EditTeammate({
  member,
  roles,
  canChangeRole,
  onClose,
  onSaved,
}: {
  member: TeamMember;
  roles: string[];
  canChangeRole: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [title, setTitle] = useState(member.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateTeammate(member.id, {
        name: name.trim(),
        title: title.trim(),
        ...(canChangeRole && role !== member.role ? { role } : {}),
      });
      toastManager.add({ type: "success", title: t.teammateUpdated, description: name.trim() });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.editTeammate}</DialogTitle>
          <DialogDescription className="font-mono">{member.username ?? ""}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <form className="flex flex-col gap-3" onSubmit={(event) => void save(event)}>
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="et-name">
                {t.fullName}
              </label>
              <Input id="et-name" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t.role}</span>
              <Select value={role} disabled={!canChangeRole} onValueChange={(value) => setRole(String(value))}>
                <SelectTrigger aria-label={t.role}>
                  <SelectValue>{(value) => roleTitle(String(value), t)}</SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {[...new Set([member.role, ...roles])].map((item) => (
                    <SelectItem key={item} value={item}>
                      {roleTitle(item, t)}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="et-title">
                {t.jobTitle}
              </label>
              <TitleInput id="et-title" role={role} value={title} onChange={setTitle} />
              <span className="text-xs text-muted-foreground">{t.jobTitleHint}</span>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {t.saveChanges}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                {t.cancel}
              </Button>
            </div>
          </form>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

export function TeamDesk() {
  const { t } = useI18n();
  const me = useDesk().user;
  const isAdmin = me.role === "admin";
  const roles = isAdmin ? ROLES : ROLES.filter((item) => item !== "logistics" && item !== "admin");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("supplier");
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<TeamMember | null>(null);
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
    try {
      setTeam(await fetchTeam());
      setError(null);
    } catch (err) {
      setTeam([]);
      if (err instanceof DeskApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Could not load team.");
    }
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
      const created = await addTeammate({ username: username.trim(), name: name.trim(), role, title: title.trim() });
      setUsername("");
      setName("");
      setTitle("");
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
                    <TableCell>
                      <span className="block">{member.name}</span>
                      {member.title && <span className="block text-xs text-muted-foreground">{member.title}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleTitle(member.role, t)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.messaging === "not_used" ? "outline" : member.hasKeys ? "success" : "warning"
                        }
                      >
                        {member.messaging === "not_used" ? t.notUsed : member.hasKeys ? t.keysReady : t.noKeys}
                        {member.devices > 1 ? ` · ${member.devices}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {(isAdmin || member.id === me.id || (member.role !== "logistics" && member.role !== "admin")) && (
                          <Button size="sm" variant="outline" onClick={() => setEditing(member)}>
                            {t.edit}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => void toggleKeys(member)}>
                          {t.passkeys}
                        </Button>
                        {(isAdmin || (member.role !== "logistics" && member.role !== "admin")) && (
                          <Button size="sm" variant="outline" onClick={() => void issue(member)}>
                            {t.issueCode}
                          </Button>
                        )}
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
          <div className="grid gap-3 sm:grid-cols-2">
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
                  {roles.map((item) => (
                    <SelectItem key={item} value={item}>
                      {roleTitle(item, t)}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="tm-title">
                {t.jobTitle}
              </label>
              <TitleInput id="tm-title" role={role} value={title} onChange={setTitle} />
              <span className="text-xs text-muted-foreground">{t.jobTitleHint}</span>
            </div>
          </div>
          <div>
            <Button size="sm" disabled={busy} onClick={() => void add()}>
              {t.addTeammate}
            </Button>
          </div>
        </CardPanel>
      </Card>
      {editing && (
        <EditTeammate
          member={editing}
          roles={roles}
          canChangeRole={editing.id !== me.id}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

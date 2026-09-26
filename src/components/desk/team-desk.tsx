"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeskApiError, addTeammate, fetchTeam, type TeamMember } from "@/lib/desk-client";
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
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setTeam(await fetchTeam());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function add() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await addTeammate({ username: username.trim(), name: name.trim(), role });
      setUsername("");
      setName("");
      setNotice(`${t.teammateAdded} ${created.username}`);
      await refresh();
    } catch (err) {
      if (err instanceof DeskApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Could not add teammate.");
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
        <CardPanel>
          <div className="overflow-x-auto">
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>{t.username}</TableHead>
                <TableHead>{t.fullName}</TableHead>
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.encryption}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.id}>
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
                </TableRow>
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

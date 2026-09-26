"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  approveWithPasskey,
  fetchCase,
  fetchCases,
  fetchDirectory,
  fetchLoads,
  fetchNotifications,
  markNotificationRead,
  patchOob,
  postLoadStatus,
  revokeCase,
  submitCase,
  type Contact,
  type SessionUser,
} from "@/lib/desk-client";
import { REQUEST_FIELDS, SCENARIOS, type DeskCase, type Load, type Note, type Role } from "@/preview/data";

const CASE_STAFF: Role[] = ["supplier", "logistics", "admin"];

type LogisticsTab = "board" | "request" | "load" | "directory" | "records" | "receipt" | "team";
type Draft = { requestType: string; contactId: string; rawText: string; requested: Record<string, string> };

type Store = {
  user: SessionUser;
  cases: DeskCase[];
  loads: Load[];
  notes: Note[];
  contacts: Contact[];
  caseId: string | null;
  openCase: (id: string) => void;
  closeCase: () => void;
  receiptToken: string | null;
  openReceipt: (token: string) => void;
  fillScenario: (id: string) => void;
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  submitDraft: () => Promise<DeskCase | null>;
  submitError: string | null;
  saveOob: (caseId: string, patch: { index?: number; note?: string }) => Promise<string | null>;
  approve: (caseId: string) => Promise<string | null>;
  revoke: (caseId: string) => Promise<string | null>;
  passkeyError: string | null;
  pushStatus: (loadId: string, status: string, simulated?: boolean) => Promise<string | null>;
  dismissNote: (id: string) => Promise<void>;
  refreshRemote: () => Promise<void>;
  refreshDirectory: () => Promise<void>;
  logisticsTab: LogisticsTab;
  setLogisticsTab: (tab: LogisticsTab) => void;
  ready: boolean;
};

const Ctx = createContext<Store | null>(null);

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function StoreProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [cases, setCases] = useState<DeskCase[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [receiptToken, setReceiptToken] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [logisticsTab, setLogisticsTab] = useState<LogisticsTab>("board");
  const [ready, setReady] = useState(false);
  const [draft, setDraftState] = useState<Draft>({
    requestType: SCENARIOS[0].requestType,
    contactId: "",
    rawText: "",
    requested: {},
  });

  const caseStaff = CASE_STAFF.includes(user.role as Role);

  const refreshRemote = useCallback(async () => {
    const [remoteLoads, remoteNotes, remoteCases] = await Promise.all([
      fetchLoads(),
      fetchNotifications(),
      caseStaff ? fetchCases() : Promise.resolve([]),
    ]);
    setLoads(remoteLoads);
    setNotes(remoteNotes);
    setCases(remoteCases);
    setReady(true);
  }, [caseStaff]);

  const refreshDirectory = useCallback(async () => {
    if (caseStaff) setContacts(await fetchDirectory());
  }, [caseStaff]);

  useEffect(() => {
    void refreshRemote();
    void refreshDirectory();
    const timer = window.setInterval(() => void refreshRemote(), 15000);
    return () => window.clearInterval(timer);
  }, [refreshDirectory, refreshRemote]);

  const replaceCase = useCallback((updated: DeskCase) => {
    setCases((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
  }, []);

  const openCase = useCallback((id: string) => {
    setPasskeyError(null);
    setCaseId(id);
    setLogisticsTab("board");
  }, []);

  const api = useMemo<Store>(() => {
    const role = user.role as Role;
    return {
      user,
      cases,
      loads,
      notes,
      contacts,
      caseId,
      openCase,
      closeCase: () => setCaseId(null),
      receiptToken,
      openReceipt: (token) => {
        setReceiptToken(token);
        setCaseId(null);
        setLogisticsTab("receipt");
      },
      fillScenario: (id) => {
        const scenario = SCENARIOS.find((item) => item.id === id);
        if (!scenario) return;
        const contact = contacts.find((item) => item.seedKey === scenario.partnerId);
        setDraftState((current) => ({
          requestType: scenario.requestType,
          contactId: contact?.id ?? current.contactId,
          rawText: scenario.rawText,
          requested: scenario.requested,
        }));
      },
      draft,
      setDraft: (patch) => setDraftState((current) => ({ ...current, ...patch })),
      submitDraft: async () => {
        if (!CASE_STAFF.includes(role)) return null;
        setSubmitError(null);
        if (!draft.contactId) {
          setSubmitError("Pick a counterparty from the directory first.");
          return null;
        }
        try {
          const created = await submitCase({
            requestType: draft.requestType,
            contactId: draft.contactId,
            rawText: draft.rawText,
            requested: REQUEST_FIELDS[draft.requestType]
              ? Object.fromEntries(REQUEST_FIELDS[draft.requestType].map((key) => [key, draft.requested[key] ?? ""]))
              : draft.requested,
          });
          setCases((current) => [created, ...current.filter((item) => item.id !== created.id)]);
          setDraftState((current) => ({ ...current, rawText: "", requested: {} }));
          return created;
        } catch (err) {
          setSubmitError(messageOf(err, "Could not submit."));
          return null;
        }
      },
      saveOob: async (id, patch) => {
        const item = cases.find((entry) => entry.id === id);
        if (!item) return "Case not found.";
        const index = patch.index;
        try {
          const updated = await patchOob(id, {
            ...(index !== undefined ? { oobStepIndex: index, oobStepDone: !item.oobDone[index] } : {}),
            ...(patch.note !== undefined ? { oobNote: patch.note } : {}),
          });
          replaceCase(updated);
          return null;
        } catch (err) {
          return messageOf(err, "Could not save the checklist.");
        }
      },
      approve: async (id) => {
        setPasskeyError(null);
        const fail = (message: string) => {
          setPasskeyError(message);
          return message;
        };
        const item = cases.find((entry) => entry.id === id);
        if (!item) return fail("Case not found.");
        if (role !== "logistics" && role !== "admin") return fail("Only logistics or admin can approve.");
        if (item.createdById === user.id) return fail("The person who opened a case cannot approve it.");
        if (item.approvals.some((approval) => approval.userId === user.id)) {
          return fail("You already signed this exact payload. A different person must sign.");
        }
        if (!item.oobDone.every(Boolean) || item.oobNote.trim().length < 4) {
          return fail("Finish the call checklist and write who you spoke with.");
        }
        try {
          await approveWithPasskey(id);
        } catch (error) {
          return fail(messageOf(error, "Passkey was not completed."));
        }
        const updated = await fetchCase(id);
        if (!updated) {
          await refreshRemote();
          return null;
        }
        replaceCase(updated);
        if (updated.status === "fully_approved" && updated.token) {
          setReceiptToken(updated.token);
          setCaseId(null);
          setLogisticsTab("receipt");
        }
        return null;
      },
      revoke: async (id) => {
        try {
          await revokeCase(id);
        } catch (err) {
          return messageOf(err, "Could not revoke the case.");
        }
        setCases((current) => current.filter((entry) => entry.id !== id));
        setCaseId(null);
        return null;
      },
      passkeyError,
      pushStatus: async (loadId, status, simulated = false) => {
        if (role !== "driver") return "Only a driver can post status.";
        try {
          await postLoadStatus(loadId, status, simulated);
        } catch (err) {
          return messageOf(err, "Could not update load status.");
        }
        setLoads((current) => current.map((item) => (item.id === loadId ? { ...item, status } : item)));
        return null;
      },
      dismissNote: async (id) => {
        setNotes((current) => current.map((note) => (note.id === id ? { ...note, read: true } : note)));
        try {
          await markNotificationRead(id);
        } catch {
          await refreshRemote();
        }
      },
      refreshRemote,
      refreshDirectory,
      logisticsTab,
      setLogisticsTab,
      ready,
      submitError,
    };
  }, [
    caseId,
    cases,
    contacts,
    draft,
    loads,
    logisticsTab,
    notes,
    openCase,
    passkeyError,
    ready,
    receiptToken,
    refreshDirectory,
    refreshRemote,
    replaceCase,
    submitError,
    user,
  ]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDesk() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Missing desk store");
  return value;
}

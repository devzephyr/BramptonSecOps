"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { approveWithPasskey, fetchCases, fetchCase, fetchLoads, fetchNotifications, patchOob, postLoadStatus, submitCase, type SessionUser } from "@/lib/desk-client";
import {
  PARTNERS,
  SCENARIOS,
  seedLoads,
  type DeskCase,
  type Load,
  type Note,
  type Role,
} from "@/preview/data";
import { randomId } from "@/preview/hash";

type Store = {
  user: SessionUser;
  cases: DeskCase[];
  loads: Load[];
  notes: Note[];
  caseId: string | null;
  openCase: (id: string) => void;
  closeCase: () => void;
  receiptToken: string | null;
  openReceipt: (token: string) => void;
  fillScenario: (id: string) => void;
  draft: { requestType: string; partnerId: string; rawText: string; requested: Record<string, string> };
  setDraft: (patch: Partial<Store["draft"]>) => void;
  submitDraft: () => Promise<void>;
  submitError: string | null;
  toggleOob: (caseId: string, index: number, note: string) => void;
  approve: (caseId: string) => Promise<string | null>;
  passkeyError: string | null;
  pushStatus: (loadId: string, status: string) => Promise<void>;
  refreshRemote: () => Promise<void>;
  managerTab: "board" | "directory" | "receipt" | "team";
  setManagerTab: (tab: "board" | "directory" | "receipt" | "team") => void;
  ready: boolean;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [cases, setCases] = useState<DeskCase[]>([]);
  const [loads, setLoads] = useState<Load[]>(seedLoads);
  const [notes, setNotes] = useState<Note[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [receiptToken, setReceiptToken] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [managerTab, setManagerTab] = useState<"board" | "directory" | "receipt" | "team">("board");
  const [ready, setReady] = useState(false);
  const [draft, setDraftState] = useState<Store["draft"]>({
    requestType: SCENARIOS[0].requestType,
    partnerId: SCENARIOS[0].partnerId,
    rawText: SCENARIOS[0].rawText,
    requested: SCENARIOS[0].requested,
  });

  const refreshRemote = useCallback(async () => {
    const [remoteLoads, remoteNotes, remoteCases] = await Promise.all([
      fetchLoads(),
      fetchNotifications(),
      fetchCases(),
    ]);
    if (remoteLoads.length > 0) setLoads(remoteLoads);
    if (remoteNotes.length > 0) setNotes(remoteNotes);
    setCases(remoteCases);
    setReady(true);
  }, []);

  useEffect(() => {
    void refreshRemote();
    const timer = window.setInterval(() => void refreshRemote(), 15000);
    return () => window.clearInterval(timer);
  }, [refreshRemote]);

  const api = useMemo<Store>(() => {
    const role = user.role as Role;
    return {
      user,
      cases,
      loads,
      notes,
      caseId,
      openCase: (id) => {
        setCaseId(id);
        setManagerTab("board");
      },
      closeCase: () => setCaseId(null),
      receiptToken,
      openReceipt: (token) => {
        setReceiptToken(token);
        setManagerTab("receipt");
      },
      fillScenario: (id) => {
        const scenario = SCENARIOS.find((item) => item.id === id);
        if (!scenario) return;
        setDraftState({
          requestType: scenario.requestType,
          partnerId: scenario.partnerId,
          rawText: scenario.rawText,
          requested: scenario.requested,
        });
      },
      draft,
      setDraft: (patch) => setDraftState((current) => ({ ...current, ...patch })),
      submitDraft: async () => {
        if (role !== "supplier") return;
        setSubmitError(null);
        const partner = PARTNERS.find((item) => item.id === draft.partnerId) ?? PARTNERS[0];
        const requested = { ...partner.onFile, ...draft.requested };
        try {
          const created = await submitCase({
            requestType: draft.requestType,
            counterparty: partner.company,
            rawText: draft.rawText,
            onFile: partner.onFile,
            requested,
          });
          setCases((current) => [created, ...current.filter((item) => item.id !== created.id)]);
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : "Could not submit.");
        }
      },
      toggleOob: (id, index, note) => {
        const applyLocal = () =>
          setCases((current) =>
            current.map((item) => {
              if (item.id !== id) return item;
              const oobDone = item.oobDone.map((done, step) => (index >= 0 && step === index ? !done : done));
              const ready = oobDone.every(Boolean) && note.trim().length > 3;
              return { ...item, oobDone, oobNote: note, status: ready ? "pending_approval" : "flagged" };
            }),
          );
        const item = cases.find((entry) => entry.id === id);
        const next = item && index >= 0 ? !item.oobDone[index] : undefined;
        void patchOob(id, {
          ...(index >= 0 ? { oobStepIndex: index, oobStepDone: next } : {}),
          oobNote: note,
        })
          .then((updated) =>
            setCases((current) => current.map((entry) => (entry.id === id ? updated : entry))),
          )
          .catch(applyLocal);
      },
      approve: async (id) => {
        setPasskeyError(null);
        const item = cases.find((entry) => entry.id === id);
        if (!item) return "Case not found.";
        if (role !== "manager" && role !== "admin") return "Only a manager can approve.";
        if (item.approvals.some((approval) => approval.userId === user.id)) {
          return "You already signed this exact payload. A different person must sign.";
        }
        if (!item.oobDone.every(Boolean) || item.oobNote.trim().length < 4) {
          return "Finish the call checklist and write who you spoke with.";
        }
        try {
          await approveWithPasskey(id);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Passkey was not completed.";
          setPasskeyError(message);
          return message;
        }
        const updated = await fetchCase(id);
        if (updated) {
          setCases((current) => current.map((entry) => (entry.id === id ? updated : entry)));
          if (updated.status === "fully_approved" && updated.token) {
            setReceiptToken(updated.token);
            setManagerTab("receipt");
          }
        } else {
          await refreshRemote();
        }
        return null;
      },
      passkeyError,
      pushStatus: async (loadId, status) => {
        if (role !== "driver") return;
        const load = loads.find((item) => item.id === loadId);
        if (!load) return;
        try {
          await postLoadStatus(loadId, status);
        } catch {
          /* keep local update when API missing in dev */
        }
        setLoads((current) => current.map((item) => (item.id === loadId ? { ...item, status } : item)));
        if (status === "fifteen_min") {
          setNotes((current) => [
            {
              id: randomId("note"),
              audience: ["manager", "admin", "receiver"],
              title: "Driver is 15 minutes away",
              body: `${load.loadRef} · ${load.commodity} · ${load.dock} · ${user.name}`,
              href: "receiver",
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...current,
          ]);
        }
      },
      refreshRemote,
      managerTab,
      setManagerTab,
      ready,
      submitError,
    };
  }, [caseId, cases, draft, loads, managerTab, notes, passkeyError, ready, receiptToken, refreshRemote, submitError, user]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDesk() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Missing desk store");
  return value;
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { CaseCeremony } from "@/components/desk/case-ceremony";
import { DirectoryDesk } from "@/components/desk/directory-desk";
import { LoadsTable } from "@/components/desk/loads-table";
import { ReceiptView } from "@/components/desk/receipt-view";
import { useI18n, caseStatusTitle } from "@/lib/i18n";
import { requestTitle } from "@/preview/data";
import { useDesk } from "@/preview/store";

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

export function ManagerDesk() {
  const desk = useDesk();
  const { lang, t } = useI18n();

  if (desk.caseId) {
    return <CaseCeremony />;
  }

  return (
    <Tabs
      value={desk.managerTab}
      onValueChange={(value) => desk.setManagerTab(value as "board" | "directory" | "receipt")}
    >
      <TabsList>
        <TabsTab value="board">{t.requests}</TabsTab>
        <TabsTab value="directory">{t.directory}</TabsTab>
        {desk.receiptToken && <TabsTab value="receipt">{t.partnerCheck}</TabsTab>}
      </TabsList>
      <TabsPanel value="board" className="flex flex-col gap-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle>{t.requests}</CardTitle>
            <CardDescription>{t.dual}</CardDescription>
          </CardHeader>
          <CardPanel>
            {!desk.ready ? (
              <div className="flex flex-col gap-2" aria-label={t.requests} aria-busy="true">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </div>
            ) : desk.cases.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>{t.empty}</EmptyTitle>
                  <EmptyDescription>{t.emptyManager}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="overflow-x-auto">
              <Table variant="card">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.who}</TableHead>
                    <TableHead>{t.type}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.hash}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {desk.cases.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.counterparty}</TableCell>
                      <TableCell>{requestTitle(item.requestType, lang)}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === "fully_approved" ? "success" : "warning"}>{caseStatusTitle(item.status, t)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{shortHash(item.payloadHash)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => desk.openCase(item.id)}>
                          {t.open}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardPanel>
        </Card>
        <LoadsTable />
      </TabsPanel>
      <TabsPanel value="directory" className="pt-4">
        <DirectoryDesk />
      </TabsPanel>
      <TabsPanel value="receipt" className="pt-4">
        <ReceiptView />
      </TabsPanel>
    </Tabs>
  );
}

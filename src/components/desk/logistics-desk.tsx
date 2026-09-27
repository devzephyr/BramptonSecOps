"use client";

import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { CaseCeremony } from "@/components/desk/case-ceremony";
import { DirectoryDesk } from "@/components/desk/directory-desk";
import { DocumentUpload } from "@/components/desk/document-upload";
import { FleetDesk } from "@/components/desk/fleet-desk";
import { LoadForm } from "@/components/desk/load-form";
import { CasesTable } from "@/components/desk/cases-table";
import { LoadsTable } from "@/components/desk/loads-table";
import { ReceiptView } from "@/components/desk/receipt-view";
import { SupplierDesk } from "@/components/desk/supplier-desk";
import { TeamDesk } from "@/components/desk/team-desk";
import { useI18n } from "@/lib/i18n";
import { useDesk } from "@/preview/store";

export function LogisticsDesk() {
  const desk = useDesk();
  const { t } = useI18n();

  if (desk.caseId) {
    return <CaseCeremony />;
  }

  return (
    <Tabs
      value={desk.logisticsTab}
      onValueChange={(value) => desk.setLogisticsTab(value as typeof desk.logisticsTab)}
    >
      <TabsList className="max-w-full overflow-x-auto">
        <TabsTab value="board">{t.requests}</TabsTab>
        <TabsTab value="fleet">{t.fleet}</TabsTab>
        <TabsTab value="request">{t.newRequest}</TabsTab>
        <TabsTab value="load">{t.newLoad}</TabsTab>
        <TabsTab value="directory">{t.directory}</TabsTab>
        <TabsTab value="records">{t.records}</TabsTab>
        <TabsTab value="team">{t.team}</TabsTab>
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
              <CasesTable cases={desk.cases} onOpen={desk.openCase} />
            )}
          </CardPanel>
        </Card>
        <LoadsTable />
      </TabsPanel>
      <TabsPanel value="fleet" className="pt-4">
        <FleetDesk />
      </TabsPanel>
      <TabsPanel value="request" className="flex flex-col gap-2 pt-4">
        <p className="text-sm text-muted-foreground">{t.newRequestHint}</p>
        <SupplierDesk />
      </TabsPanel>
      <TabsPanel value="load" className="pt-4">
        <LoadForm onCreated={() => desk.setLogisticsTab("board")} />
      </TabsPanel>
      <TabsPanel value="directory" className="pt-4">
        <DirectoryDesk />
      </TabsPanel>
      <TabsPanel value="records" className="pt-4">
        <DocumentUpload ledger />
      </TabsPanel>
      <TabsPanel value="team" className="pt-4">
        <TeamDesk />
      </TabsPanel>
      <TabsPanel value="receipt" className="pt-4">
        <ReceiptView />
      </TabsPanel>
    </Tabs>
  );
}

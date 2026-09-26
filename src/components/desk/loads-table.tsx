"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadDialog } from "@/components/desk/load-dialog";
import { useI18n, loadStatusTitle } from "@/lib/i18n";
import { useDesk } from "@/preview/store";

export function LoadsTable() {
  const desk = useDesk();
  const { t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.loads}</CardTitle>
        <CardDescription>{t.loadsHint}</CardDescription>
      </CardHeader>
      <CardPanel>
        <div className="overflow-x-auto">
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>{t.load}</TableHead>
              <TableHead>{t.goods}</TableHead>
              <TableHead>{t.dock}</TableHead>
              <TableHead>{t.status}</TableHead>
              <TableHead>{t.seal}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {desk.loads.map((load) => (
              <TableRow key={load.id}>
                <TableCell>{load.loadRef}</TableCell>
                <TableCell>{load.commodity}</TableCell>
                <TableCell>{load.dock}</TableCell>
                <TableCell>
                  <Badge variant={load.status === "fifteen_min" ? "warning" : "outline"}>{loadStatusTitle(load.status, t)}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{load.seal}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setOpenId(load.id)}>
                    {t.details}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <LoadDialog
          load={desk.loads.find((item) => item.id === openId) ?? null}
          onClose={() => setOpenId(null)}
        />
      </CardPanel>
    </Card>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { useDesk } from "@/preview/store";

export function LoadsTable() {
  const desk = useDesk();
  const { t } = useI18n();

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {desk.loads.map((load) => (
              <TableRow key={load.id}>
                <TableCell>{load.loadRef}</TableCell>
                <TableCell>{load.commodity}</TableCell>
                <TableCell>{load.dock}</TableCell>
                <TableCell>
                  <Badge variant={load.status === "fifteen_min" ? "warning" : "outline"}>{load.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{load.seal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardPanel>
    </Card>
  );
}

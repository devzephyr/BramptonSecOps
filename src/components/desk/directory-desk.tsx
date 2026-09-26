"use client";

import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CallLink } from "@/components/desk/call-link";
import { useI18n } from "@/lib/i18n";
import { PARTNERS } from "@/preview/data";

export function DirectoryDesk() {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.directory}</CardTitle>
        <CardDescription>{t.directoryHint}</CardDescription>
      </CardHeader>
      <CardPanel>
        <div className="overflow-x-auto">
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>{t.company}</TableHead>
              <TableHead>{t.city}</TableHead>
              <TableHead>{t.domain}</TableHead>
              <TableHead>{t.numberOnFile}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PARTNERS.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell>{partner.company}</TableCell>
                <TableCell>{partner.city}</TableCell>
                <TableCell>{partner.domain}</TableCell>
                <TableCell>
                  <CallLink numberOnFile={partner.numberOnFile} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardPanel>
    </Card>
  );
}

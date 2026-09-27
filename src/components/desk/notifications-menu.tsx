"use client";

import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import type { Role } from "@/preview/data";
import { useDesk } from "@/preview/store";

export function NotificationsMenu() {
  const desk = useDesk();
  const { lang, t } = useI18n();
  const role = desk.user.role as Role;
  const notes = desk.notes
    .filter((note) => note.audience.includes(role))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = notes.filter((note) => !note.read).length;
  const when = new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" });

  return (
    <Popover>
      <PopoverTrigger
        render={<Button size="sm" variant={unread ? "default" : "outline"} aria-label={`${unread} ${unread === 1 ? t.alertOne : t.alerts}`} />}
      >
        <BellIcon aria-hidden />
        {unread} {unread === 1 ? t.alertOne : t.alerts}
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-[min(24rem,calc(100vw-2rem))]">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noAlerts}</p>
        ) : (
          <ul className="flex max-h-96 flex-col divide-y overflow-y-auto">
            {notes.map((note) => (
              <li key={note.id} className="flex flex-col gap-1 py-2">
                <div className="flex items-start gap-2">
                  <span className={note.read ? "text-sm" : "text-sm font-semibold"}>{note.title}</span>
                  {!note.read && (
                    <Button size="xs" variant="ghost" className="ml-auto" onClick={() => void desk.dismissNote(note.id)}>
                      {t.dismiss}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{note.body}</p>
                <time className="text-xs text-muted-foreground" dateTime={note.createdAt}>
                  {when.format(new Date(note.createdAt))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </PopoverPopup>
    </Popover>
  );
}

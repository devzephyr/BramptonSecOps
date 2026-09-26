"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { driverPhotoUrl } from "@/lib/desk-client";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function DriverAvatar({
  id,
  name,
  photoVersion,
  className,
}: {
  id: string;
  name: string;
  photoVersion: string | null;
  className?: string;
}) {
  const src = driverPhotoUrl(id, photoVersion);
  return (
    <Avatar className={cn("size-12 border text-sm", className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

"use client";

import { Spinner } from "@/components/ui/spinner";

export function GateLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background text-foreground"
      role="status"
      aria-label="Loading"
    >
      <Spinner />
    </div>
  );
}

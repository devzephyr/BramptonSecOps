"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useI18n } from "@/lib/i18n";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useI18n();
  const { copied, copy } = useCopyToClipboard();

  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={copied ? t.copied : `${t.copy}: ${label}`}
      title={copied ? t.copied : `${t.copy}: ${label}`}
      onClick={() => void copy(text).catch(() => undefined)}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? t.copied : t.copy}
    </Button>
  );
}

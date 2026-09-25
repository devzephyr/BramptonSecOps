"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function receiptVerifyUrl(token: string, origin?: string) {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/v/${encodeURIComponent(token)}`;
}

export function QrLink({ token, origin }: { token: string; origin?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const url = receiptVerifyUrl(token, origin);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(url, { type: "svg", margin: 1, width: 168 }).then(
      (value) => {
        if (!cancelled) setSvg(value);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!svg) return null;

  return (
    <div
      className="inline-block [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full"
      aria-label={`QR code for verification link ${url}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  PublicReceipt,
  type PublicReceiptData,
} from "@/components/receipt/PublicReceipt";

type PageProps = {
  params: Promise<{ token: string }>;
};

async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";
  }
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function loadReceipt(token: string): Promise<PublicReceiptData | null | undefined> {
  try {
    const origin = await appOrigin();
    const res = await fetch(
      `${origin}/api/receipts/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    return (await res.json()) as PublicReceiptData;
  } catch {
    return undefined;
  }
}

export default async function PublicReceiptPage({ params }: PageProps) {
  const { token } = await params;
  const initial = await loadReceipt(token);
  if (initial === null) notFound();
  return <PublicReceipt token={token} initial={initial} />;
}

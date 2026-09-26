import { notFound } from "next/navigation";
import { PublicReceipt, type PublicReceiptData } from "@/components/receipt/PublicReceipt";
import { loadPublicReceipt } from "@/lib/receipt";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicReceiptPage({ params }: PageProps) {
  const { token } = await params;
  const receipt = await loadPublicReceipt(token).catch(() => undefined);
  if (receipt === null) notFound();
  return <PublicReceipt token={token} initial={receipt as PublicReceiptData | undefined} />;
}

import { json, notFound } from "@/lib/http";
import { loadPublicReceipt } from "@/lib/receipt";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const receipt = await loadPublicReceipt(token);
  return receipt ? json(receipt) : notFound();
}

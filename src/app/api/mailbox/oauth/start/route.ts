import { requireUser } from "@/lib/auth";
import { json, unauthorized } from "@/lib/http";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const provider = new URL(request.url).searchParams.get("provider") ?? "graph";
  const clientEnv =
    provider === "gmail"
      ? process.env.GMAIL_CLIENT_ID
      : process.env.GRAPH_CLIENT_ID;

  if (!clientEnv) {
    return json(
      {
        error: "Mailbox OAuth is not configured for this demo.",
        provider,
      },
      501,
    );
  }

  return json({
    provider,
    authorizeUrl: `${provider}-oauth-not-wired-in-demo`,
  });
}

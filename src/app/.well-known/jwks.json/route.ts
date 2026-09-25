import { publicJwks } from "@/lib/receipt";

export async function GET() {
  const jwks = await publicJwks();
  return Response.json(jwks, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}

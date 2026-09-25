import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-16 sm:py-24">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">For organizations</Badge>
          <Badge variant="secondary">Canada-first</Badge>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Check the request before the dock moves.
          </h1>
          <p className="text-lg text-muted-foreground">
            Organizations write a supply-chain request in a sealed thread, call
            the number already on file, and require two different people to
            confirm it with a passkey before anyone acts.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Three steps that stay the same</CardTitle>
            <CardDescription>Plain language on purpose.</CardDescription>
          </CardHeader>
          <CardPanel className="space-y-3 text-base">
            <p>Write it in the sealed thread.</p>
            <p>Call the number already on file.</p>
            <p>Two different people confirm with a passkey.</p>
          </CardPanel>
          <CardFooter>
            <Button render={<Link href="/sign-in" />} size="lg">
              Sign in with a passkey
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          SupplyChek attestation — not a government certification
        </p>
      </main>
    </div>
  );
}

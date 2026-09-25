import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        This desk page does not exist. Approvals only happen on real cases, so
        head back to sign-in and open a case from the board.
      </p>
      <Link href="/sign-in" className="text-sm underline">
        Back to sign-in
      </Link>
    </main>
  );
}

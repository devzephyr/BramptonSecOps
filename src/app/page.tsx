import { Big_Shoulders, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Showreel } from "@/components/landing/showreel";

const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-reel-display",
  // Next has no fallback metrics for this family; name a condensed fallback.
  adjustFontFallback: false,
  fallback: ["Arial Narrow", "sans-serif"],
});
const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-reel-body",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-reel-mono",
});

const STEPS = [
  {
    title: "Write it in the sealed thread",
    body: "Pick the request type and write the change. SupplyChek shows plain-language flags and a playbook, then records a hash of the note.",
  },
  {
    title: "Call the number already on file",
    body: "Not the number in the email, the PDF or the screenshot. The playbook tells you who to call and what to ask.",
  },
  {
    title: "Two different people confirm",
    body: "Two managers approve with a passkey. Both approvals are tied to the same payload hash, so nobody signs a different version.",
  },
  {
    title: "Your partner gets a receipt",
    body: "A receipt link shows the payload hash, who signed, when, and an Ed25519 signature from the server.",
  },
];

export default function Home() {
  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-[#eef6f9] text-[#0c1b26] [font-family:var(--font-reel-body)]`}
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <span className="text-2xl font-extrabold tracking-wide uppercase [font-family:var(--font-reel-display)]">
          Supply<span className="text-[#1c7fa6]">Chek</span>
        </span>
        <Link
          href="/sign-in"
          className="rounded-full px-4 py-2 text-sm font-semibold text-[#0c1b26] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#1c7fa6]"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <section className="grid gap-6 pt-6 pb-10 sm:pt-12 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#1c7fa6] uppercase [font-family:var(--font-reel-mono)]">
              Ontario cold chain · Canada-first
            </p>
            <h1 className="mt-3 text-5xl leading-[0.95] font-extrabold uppercase sm:text-7xl [font-family:var(--font-reel-display)]">
              Check the request before the dock moves.
            </h1>
          </div>
          <div className="space-y-5">
            <p className="text-lg leading-relaxed text-[#3d5566]">
              Write the supply-chain request in a sealed thread, call the number
              already on file, and have two different people confirm it with a
              passkey before anyone acts.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex h-12 items-center rounded-full bg-[#0c1b26] px-6 font-semibold text-[#e8f3f8] outline-none transition hover:bg-[#12283a] focus-visible:ring-2 focus-visible:ring-[#1c7fa6] focus-visible:ring-offset-2"
            >
              Sign in with a passkey
            </Link>
          </div>
        </section>

        <section aria-label="How SupplyChek works, in 15 seconds">
          <Showreel
            fonts={{
              display: display.style.fontFamily,
              body: body.style.fontFamily,
              mono: mono.style.fontFamily,
            }}
          />
        </section>

        <section className="pt-20" aria-labelledby="steps">
          <h2
            id="steps"
            className="text-4xl font-extrabold uppercase sm:text-5xl [font-family:var(--font-reel-display)]"
          >
            Four steps that stay the same
          </h2>
          <p className="mt-2 text-[#3d5566]">Plain language on purpose.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="rounded-2xl border border-[#0c1b26]/10 bg-white/70 p-5"
              >
                <span className="text-sm font-semibold text-[#1c7fa6] [font-family:var(--font-reel-mono)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3d5566]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 pt-16 lg:grid-cols-2">
          <div className="rounded-2xl bg-[#0c1b26] p-6 text-[#e8f3f8] sm:p-8">
            <h2 className="text-3xl font-extrabold uppercase [font-family:var(--font-reel-display)]">
              Built for Ontario cold chains
            </h2>
            <p className="mt-3 leading-relaxed text-[#c9dde6]">
              High-value refrigerated loads move through Mississauga and Peel
              every day. A last-minute dock or banking change by email is common
              in fraud, and rare in legitimate operations unless you confirm it
              out of band.
            </p>
            <p className="mt-4 text-sm text-[#9fd3e6]">
              Équité Association reported about 1,601 cargo thefts in Ontario in
              2025, against about 240 in Alberta and 180 in Quebec, and says
              losses are often under-reported.{" "}
              <a
                href="https://www.trucknews.com/security/canadas-trailer-theft-nearly-doubles-as-cargo-losses-go-underreported-in-2025/1003209612/"
                className="underline underline-offset-2 hover:text-white"
              >
                Source: Truck News, 2025
              </a>
            </p>
          </div>
          <div className="rounded-2xl border border-[#0c1b26]/10 bg-white/70 p-6 sm:p-8">
            <h2 className="text-3xl font-extrabold uppercase [font-family:var(--font-reel-display)]">
              What we don&rsquo;t claim
            </h2>
            <p className="mt-3 leading-relaxed text-[#3d5566]">
              Mail-authentication passes and encrypted transport do not prove a
              request is real. SupplyChek shows heuristics and playbooks so your
              team calls the number already on file every time payment details,
              destinations or access are on the line.
            </p>
            <p className="mt-3 leading-relaxed text-[#3d5566]">
              Flags are heuristics, not a verdict. A SupplyChek receipt is our
              own attestation, not a government certification.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0c1b26]/10 px-4 py-6 text-center text-xs text-[#5d7385]">
        SupplyChek attestation — not a government certification
      </footer>
    </div>
  );
}

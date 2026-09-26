"use client";

export function telHref(numberOnFile: string): string {
  const digits = numberOnFile.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `1${digits}` : digits;
  return `tel:+${normalized}`;
}

export function CallLink({ numberOnFile }: { numberOnFile: string }) {
  return (
    <a className="underline underline-offset-2" href={telHref(numberOnFile)}>
      {numberOnFile}
    </a>
  );
}

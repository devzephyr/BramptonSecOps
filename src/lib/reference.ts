/**
 * Short, readable form of a request's fingerprint (SHA-256 of the exact request), e.g. "26E1-6A94-FE7B".
 * The same code shows on the desk, in the approval dialog, and on the partner receipt, so people can
 * read it to each other over the phone and confirm they are looking at the same request.
 */
export function referenceCode(hash: string): string {
  const head = hash.replace(/[^0-9a-f]/gi, "").slice(0, 12).toUpperCase();
  return head.match(/.{1,4}/g)?.join("-") ?? head;
}

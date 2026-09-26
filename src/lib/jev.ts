/** Classification only. Never writes a decision. */
export function jevClassify(rawText: string, requestType: string) {
  if (process.env.JEV_ENABLED !== "true") return null;
  const labels: string[] = [];
  if (
    /bank|eft|transit|institution|void cheque|interac/i.test(rawText) ||
    requestType === "bank_change"
  ) {
    labels.push("payment-redirection");
  }
  if (/urgent|immediately|asap|do not call/i.test(rawText))
    labels.push("urgency");
  if (
    requestType === "new_carrier" ||
    /double broker|new carrier/i.test(rawText)
  ) {
    labels.push("carrier-introduction");
  }
  if (
    requestType === "credential_request" ||
    /portal|remote access/i.test(rawText)
  ) {
    labels.push("access-request");
  }
  if (
    requestType === "destination_change" ||
    /divert|new dock|yard/i.test(rawText)
  ) {
    labels.push("route-change");
  }
  return {
    labels,
    effect: "classify-only" as const,
    note: "Automated labels are advisory. They do not approve anything.",
  };
}

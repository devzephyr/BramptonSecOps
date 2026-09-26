import type { DirectoryContact } from "@prisma/client";
import type { PayloadFields } from "@/lib/payload";

export function contactOnFile(contact: DirectoryContact): PayloadFields {
  const onFile: PayloadFields = {};
  const bank = contact.bankOnFile as Record<string, unknown> | null;
  if (bank && typeof bank === "object") {
    for (const key of ["institution", "transit", "account"]) {
      if (typeof bank[key] === "string" && bank[key])
        onFile[key] = bank[key] as string;
    }
  }
  if (contact.dockOnFile) onFile.dock = contact.dockOnFile;
  if (contact.carrierOnFile) onFile.carrier = contact.carrierOnFile;
  return onFile;
}

export function serializeContact(contact: DirectoryContact) {
  return {
    id: contact.id,
    seedKey: contact.seedKey,
    company: contact.company,
    name: contact.name,
    roleLabel: contact.roleLabel,
    city: contact.city,
    domain: contact.domain,
    numberOnFile: contact.numberOnFile,
    onFile: contactOnFile(contact),
  };
}

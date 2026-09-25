"use client";

import { AppGate } from "@/components/desk/app-gate";
import { I18nProvider } from "@/lib/i18n";

export default function SignInPage() {
  return (
    <I18nProvider>
      <AppGate />
    </I18nProvider>
  );
}

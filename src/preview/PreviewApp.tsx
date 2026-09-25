import { AppGate } from "@/components/desk/app-gate";
import { I18nProvider } from "@/lib/i18n";

export function PreviewApp() {
  return (
    <I18nProvider>
      <AppGate />
    </I18nProvider>
  );
}

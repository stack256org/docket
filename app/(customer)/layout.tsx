import type { ReactNode } from "react";
import { ThemeResetScript } from "@/components/theme/theme-reset-script";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeResetScript />
      {children}
    </>
  );
}

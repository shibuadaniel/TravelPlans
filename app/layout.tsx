import type { Metadata, Viewport } from "next";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/700.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/source-serif-4/700.css";
import { AppShell } from "@/components/app-shell";
import { ThemeRegistry } from "@/components/theme-registry";
import { getCurrentUser } from "@/lib/current";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Where are we?", template: "%s · Where are we?" },
  description: "Shareable family trip briefings.",
  applicationName: "Where are we?",
};

export const viewport: Viewport = {
  themeColor: "#0f4c5c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeRegistry>
          <AppShell signedIn={Boolean(user)}>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}

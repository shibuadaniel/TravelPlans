import type { Metadata, Viewport } from "next";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { AppShell } from "@/components/app-shell";
import { ThemeRegistry } from "@/components/theme-registry";
import { getCurrentUser } from "@/lib/current";
import { userAvatar } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Reveal", template: "%s · Reveal" },
  description: "Shareable family trip briefings.",
  applicationName: "Reveal",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f4c5c" },
    { media: "(prefers-color-scheme: dark)", color: "#0f171b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const account = user
    ? { name: user.name, email: user.email, hasPhoto: Boolean(await userAvatar(user.id)) }
    : null;
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeRegistry>
          <AppShell account={account}>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}

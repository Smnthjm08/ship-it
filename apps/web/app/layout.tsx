import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { AuthSession } from "@/types/session";
import { AuthProvider } from "@/components/providers/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/globals/app-shell";

// DESIGN.md runs one typeface: Inter carries display and body alike, split by
// weight and tracking rather than by family. --font-display therefore points at
// Inter too, so .font-display keeps working without loading a second face.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShipIt",
  description: "Ship your projects faster",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = (await auth.api.getSession({
    headers: await headers(),
  })) as AuthSession | null;

  return (
    <html
      lang="en"
      className={inter.variable}
      suppressContentEditableWarning
      suppressHydrationWarning
    >
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <TooltipProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider user={session?.user || null}>
              <AppShell>{children}</AppShell>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

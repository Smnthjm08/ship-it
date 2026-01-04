// "use client";

import AppBar from "@/components/appbar";
import { AuthProvider } from "@/components/providers/auth-provider";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  console.log("======", session);

  if (!session) {
    redirect("/connect-github");
  }

  return (
    <main>
      <AuthProvider session={session}>
        <AppBar />
        <div>{children}</div>
      </AuthProvider>
    </main>
  );
}

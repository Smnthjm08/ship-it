import { Button } from "@/components/ui/button";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import Link from "next/link";
import type { AuthSession } from "@/types/session";

export default async function HomePage() {
  const session = (await auth.api.getSession({
    headers: await headers(),
  })) as AuthSession | null;

  console.log(">>", session);

  if (session) {
    return (
      <div>
        <main className="flex flex-col min-h-screen items-center justify-center gap-2">
          <h1>Welcome back, {session.user.name}!</h1>
        </main>
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen items-center justify-center gap-2">
      <h1 className="font-extrabold text-xl">ShipIt</h1>
      <Button asChild>
        <Link href={"/connect-github"}>Connect Github</Link>
      </Button>
    </main>
  );
}

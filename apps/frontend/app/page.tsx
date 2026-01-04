import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="font-bold text-4xl">Ship It</div>
      <div className="text-xl font-semibold ">Frontend Deployment Platform</div>

      <Button variant="defaultlink" asChild>
        <Link href="/connect-github">Connect Github</Link>
      </Button>
    </main>
  );
}

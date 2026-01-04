import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-5xl font-bold tracking-tight">404</h1>
      <p className="text-sm text-muted-foreground">
        The page you’re looking for doesn’t exist.
      </p>

      <Button asChild size="sm">
        <Link href="/">Go back home</Link>
      </Button>
    </main>
  );
}

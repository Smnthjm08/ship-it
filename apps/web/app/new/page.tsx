import { headers } from "next/headers";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RepoList } from "@/components/new/repo-list";
import { GitUrlInput } from "@/components/new/git-url-input";

interface NewProjectPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const { q } = await searchParams;
  const headersList = await headers();
  const cookie = headersList.get("cookie") ?? "";

  // NEXT_PUBLIC_API_BASE_URL already includes the /api/v1 prefix — see .env.
  // A leading slash here (`new URL("/new", baseURL)`) would discard that
  // prefix entirely, since the WHATWG URL spec resolves a path starting
  // with "/" against the origin root rather than the base's own path.
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/new`);
  if (q) url.searchParams.set("q", String(q));

  // A failed fetch used to fall through to an empty array, which rendered as
  // "No repositories found" — the user read that as "I have no repos" rather
  // than "your GitHub token expired".
  let repos: unknown[] = [];
  let loadError: string | null = null;

  try {
    const res = await fetch(url.toString(), {
      headers: { cookie },
      credentials: "include",
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 404) {
      loadError =
        "ShipIt can't reach your GitHub account. Reconnect GitHub and try again.";
    } else if (!res.ok) {
      loadError = `GitHub returned an error (${res.status}). Try again in a moment.`;
    } else {
      const json = await res.json();
      repos = Array.isArray(json?.data) ? json.data : [];
    }
  } catch (error) {
    console.error("Failed to load repositories:", error);
    loadError =
      "Couldn't reach the ShipIt API. Check that the backend is running.";
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 md:py-10">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/projects">
          <ArrowLeft aria-hidden />
          Back to projects
        </Link>
      </Button>

      <div className="mt-6 mb-8">
        <h1 className="text-display-sm">
          Import a repository
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick a GitHub repo and ShipIt builds it and serves it on its own URL.
        </p>
      </div>

      <GitUrlInput />

      <div className="mt-10">
        <h2 className="text-eyebrow text-muted-foreground mb-3">
          Your repositories
        </h2>

        {loadError ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertTitle>Couldn&apos;t load your repositories</AlertTitle>
            <AlertDescription>
              <p>{loadError}</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/connect-github">Reconnect GitHub</Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <RepoList repos={repos} />
        )}
      </div>
    </main>
  );
}

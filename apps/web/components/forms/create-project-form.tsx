import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { clientAxios } from "@/lib/axios-instance";
import { toast } from "sonner";
import { EnvVarEditor } from "@/components/forms/env-var-editor";
import {
  findEnvVarError,
  toEnvVarPayload,
  type EnvVarRow,
} from "@/lib/env-vars";

export default function CreateNewProjectForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const repoUrl = searchParams.get("url");
  const branch = searchParams.get("branch") ?? "main";
  const language = searchParams.get("language");

  // GitHub already told us the primary language on the previous screen — use it
  // as the starting guess rather than making the user pick from scratch.
  const [framework, setFramework] = useState<
    "NONE" | "NEXTJS" | "REACT" | "VITE" | "NODE"
  >(() =>
    language === "TypeScript" || language === "JavaScript" ? "VITE" : "NONE",
  );
  const [buildCommand, setBuildCommand] = useState<string>("");
  const [outputDir, setOutputDir] = useState<string>("");
  const [envVars, setEnvVars] = useState<EnvVarRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    switch (framework) {
      case "NEXTJS":
        setBuildCommand("npm run build");
        // Static export only — see the notice below.
        setOutputDir("out");
        break;
      case "REACT":
        setBuildCommand("npm run build");
        setOutputDir("build");
        break;
      case "VITE":
        setBuildCommand("npm run build");
        setOutputDir("dist");
        break;
      case "NODE":
        setBuildCommand("");
        setOutputDir("");
        break;
      default:
        setBuildCommand("");
        setOutputDir("");
    }
  }, [framework]);

  // Bail out after the hooks so they run in the same order on every render.
  if (!owner || !repo || !repoUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="text-center">
          <p className="font-medium">This import link is incomplete</p>
          <p className="text-muted-foreground mt-1 text-sm">
            It&apos;s missing the repository owner or name. Pick the repo from
            the list instead.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/new">Choose a repository</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const envError = findEnvVarError(envVars);
    if (envError) {
      toast.error(envError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await clientAxios.post("/new", {
        name: repo,
        repoUrl: repoUrl,
        project: repo, // controller expects `project`, form has `repo`
        owner: owner,
        branch: branch,
        framework: framework,
        buildCommand: buildCommand,
        installCommand: (e.target as any).installCommand.value,
        rootDir: (e.target as any).rootDir.value,
        outputDir: (e.target as any).outputDir.value,
        envVars: toEnvVarPayload(envVars),
      });

      if (response.status === 201) {
        toast.success("Project created successfully");
        const projectId = response.data.data.id;
        const deploymentId = response.data.res.id;
        router.push(`/projects/${projectId}/deployments/${deploymentId}`);
      }
    } catch (error) {
      console.log("Error creating project", error);
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Failed to create project";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-10">
      <div className="mb-8">
        <h1 className="text-display-sm">New project</h1>
        {/* The repo you're importing, stated as fact — not a form field. */}
        <Link
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground font-machine mt-2 inline-flex items-center gap-2 text-xs transition-colors duration-150 ease-shipit"
        >
          <span>
            {owner}/{repo}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitBranch className="size-3" aria-hidden />
            {branch}
          </span>
        </Link>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <FieldSet>
          <FieldLegend className="text-eyebrow text-muted-foreground">
            Project
          </FieldLegend>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Project Name</FieldLabel>
                <Input
                  name="name"
                  required
                  defaultValue={repo}
                  placeholder="My Awesome App"
                />
              </Field>

              <Field>
                <FieldLabel>Framework</FieldLabel>
                <Select
                  name="framework"
                  value={framework}
                  onValueChange={(value) => {
                    if (!value) return;
                    setFramework(value as typeof framework);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Auto detect</SelectItem>
                    <SelectItem value="NEXTJS">Next.js</SelectItem>
                    <SelectItem value="REACT">React</SelectItem>
                    <SelectItem value="VITE">Vite</SelectItem>
                    <SelectItem value="NODE">Node.js</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {framework === "NEXTJS" && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
                ShipIt serves static files, so it can&apos;t run a Next.js
                server. Your build is configured for{" "}
                <code className="font-mono">output: &quot;export&quot;</code>{" "}
                automatically — no change to your repo. Pages that render at
                build time deploy fine; middleware, route handlers, API routes,{" "}
                <code className="font-mono">getServerSideProps</code> and ISR
                are rejected before the build starts.
              </div>
            )}

            {framework === "NODE" && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
                ShipIt has no Node runtime yet — it only serves static files
                from S3. A plain Node.js server won&apos;t be reachable after
                deploying.
              </div>
            )}
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend className="text-eyebrow text-muted-foreground">
            Build &amp; output
          </FieldLegend>
          <FieldGroup>
            <Field>
              <FieldLabel>Install command</FieldLabel>
              <Input
                name="installCommand"
                defaultValue="npm install"
                placeholder="npm install"
                className="font-machine text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              <FieldDescription>
                Leave empty to detect from your lockfile.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Build command</FieldLabel>
              <Input
                name="buildCommand"
                placeholder="npm run build"
                value={buildCommand}
                onChange={(e) => setBuildCommand(e.target.value)}
                className="font-machine text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              <FieldDescription>
                Leave empty if no build step is required.
              </FieldDescription>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Root directory</FieldLabel>
                <Input
                  name="rootDir"
                  defaultValue="./"
                  placeholder="./"
                  className="font-machine text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
                <FieldDescription>
                  Where the app lives in the repo.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Output directory</FieldLabel>
                <Input
                  name="outputDir"
                  placeholder="dist"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  className="font-machine text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
                <FieldDescription>
                  Static files to serve. Empty auto-detects.
                </FieldDescription>
              </Field>
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend className="text-eyebrow text-muted-foreground">
            Environment variables
          </FieldLegend>
          <FieldGroup>
            <Field>
              <FieldDescription>
                Written to <code className="font-machine">.env</code> in your
                project root before the build runs. Encrypted at rest and hidden
                once saved.
              </FieldDescription>
              <EnvVarEditor
                rows={envVars}
                onChange={setEnvVars}
                disabled={isSubmitting}
              />
              {(framework === "REACT" ||
                framework === "VITE" ||
                framework === "NEXTJS") && (
                <FieldDescription>
                  Only{" "}
                  <code className="font-machine">
                    {framework === "VITE"
                      ? "VITE_"
                      : framework === "NEXTJS"
                        ? "NEXT_PUBLIC_"
                        : "REACT_APP_"}
                  </code>{" "}
                  variables reach browser code. Others are available to the
                  build but not the shipped bundle.
                </FieldDescription>
              )}
              <FieldDescription>
                Build-time values are baked into static output and readable by
                anyone visiting the site — keep server-side secrets out.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FieldSet>

        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="repoName" value={repo} />
        <input type="hidden" name="branch" value={branch} />

        <div className="flex items-center gap-3 border-t pt-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Deploying…" : "Deploy"}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/new">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

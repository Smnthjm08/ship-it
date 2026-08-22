"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientAxios } from "@/lib/axios-instance";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Framework = "NONE" | "NEXTJS" | "REACT" | "VITE" | "NODE";

interface BuildConfigFormProps {
  projectId: string;
  initial: {
    framework: Framework;
    buildCommand: string;
    installCommand: string;
    rootDir: string;
    outputDir: string;
    branch: string;
  };
}

/** Defaults applied when the user switches framework, matching the import form. */
const FRAMEWORK_DEFAULTS: Record<
  Framework,
  { buildCommand: string; outputDir: string }
> = {
  NEXTJS: { buildCommand: "npm run build", outputDir: "out" },
  REACT: { buildCommand: "npm run build", outputDir: "build" },
  VITE: { buildCommand: "npm run build", outputDir: "dist" },
  NODE: { buildCommand: "", outputDir: "" },
  NONE: { buildCommand: "", outputDir: "" },
};

/**
 * These were set once at import and never editable again — so a project that
 * failed with the wrong output directory could only be fixed by deleting it
 * and re-importing. This form closes that dead end.
 */
export function BuildConfigForm({ projectId, initial }: BuildConfigFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(initial);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onFrameworkChange = (value: string) => {
    const framework = value as Framework;
    const defaults = FRAMEWORK_DEFAULTS[framework];
    setForm((current) => ({
      ...current,
      framework,
      // Only fill in fields the user hasn't customised, so switching framework
      // to check an option doesn't silently discard their commands.
      buildCommand: current.buildCommand || defaults.buildCommand,
      outputDir: current.outputDir || defaults.outputDir,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.branch.trim()) {
      toast.error("Production branch is required.");
      return;
    }

    setIsSaving(true);
    try {
      // The endpoint patches only the fields it receives, so this form never
      // touches the project's name or description.
      await clientAxios.patch(`/projects/${projectId}`, {
        ...form,
        branch: form.branch.trim(),
      });
      toast.success("Build settings saved. Redeploy to apply them.");
      router.refresh();
    } catch (error) {
      console.error("Failed to update build settings", error);
      const message =
        (error as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Failed to save build settings";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>Build &amp; Output</CardTitle>
          <CardDescription>
            How ShipIt installs, builds, and finds the static files to serve.
            Changes apply on the next deployment.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="framework">Framework</Label>
              <Select value={form.framework} onValueChange={onFrameworkChange}>
                <SelectTrigger id="framework">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No framework</SelectItem>
                  <SelectItem value="NEXTJS">Next.js</SelectItem>
                  <SelectItem value="REACT">React</SelectItem>
                  <SelectItem value="VITE">Vite</SelectItem>
                  <SelectItem value="NODE">Node.js</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Production branch</Label>
              <Input
                id="branch"
                className="font-machine text-sm"
                value={form.branch}
                onChange={(e) => set("branch", e.target.value)}
                placeholder="main"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="installCommand">Install command</Label>
            <Input
              id="installCommand"
              className="font-machine text-sm"
              value={form.installCommand}
              onChange={(e) => set("installCommand", e.target.value)}
              placeholder="npm install"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-muted-foreground text-xs">
              Leave empty to detect from your lockfile.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buildCommand">Build command</Label>
            <Input
              id="buildCommand"
              className="font-machine text-sm"
              value={form.buildCommand}
              onChange={(e) => set("buildCommand", e.target.value)}
              placeholder="npm run build"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-muted-foreground text-xs">
              Leave empty if the project needs no build step.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rootDir">Root directory</Label>
              <Input
                id="rootDir"
                className="font-machine text-sm"
                value={form.rootDir}
                onChange={(e) => set("rootDir", e.target.value)}
                placeholder="./"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-muted-foreground text-xs">
                Where the app lives inside the repo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outputDir">Output directory</Label>
              <Input
                id="outputDir"
                className="font-machine text-sm"
                value={form.outputDir}
                onChange={(e) => set("outputDir", e.target.value)}
                placeholder="dist"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-muted-foreground text-xs">
                Static files to serve. Empty auto-detects.
              </p>
            </div>
          </div>

          {form.framework === "NEXTJS" && (
            <div className="border-warning/40 bg-warning/10 rounded-md border p-3 text-xs">
              ShipIt serves static files, so it can&apos;t run a Next.js server.
              Each build is configured for{" "}
              <code className="font-machine">output: &quot;export&quot;</code>{" "}
              automatically and writes to{" "}
              <code className="font-machine">out/</code>. Server-only features
              are rejected before the build starts.
            </div>
          )}

          {form.framework === "NODE" && (
            <div className="border-warning/40 bg-warning/10 rounded-md border p-3 text-xs">
              ShipIt has no Node runtime — it serves static files from S3. A
              plain Node server won&apos;t be reachable after deploying.
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Saving...
              </>
            ) : (
              <>
                <Save aria-hidden />
                Save build settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

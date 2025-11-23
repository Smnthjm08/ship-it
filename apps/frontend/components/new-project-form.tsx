"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldDescription,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";

import { useSearchParams, useRouter } from "next/navigation";
import { GitBranchIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function NewProjectForm() {
  const repo = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDeployProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const payload = {
      repo: repo.get("repo"),
      branch: repo.get("branch"),

      name: form.get("project-name"),
      framework: form.get("framework"),
      rootDir: form.get("root-directory"),
      buildCommand: form.get("build-command"),
      outputDir: form.get("output-directory"),
      installCommand: form.get("install-command"),
    };

    const res = await fetch("/api/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.log("Error creating project:", data);
      setLoading(false);
      return;
    }

    router.push(`/project/${data.project.id}`);
  }

  return (
    <div className="w-full max-w-md mx-auto pt-8">
      <form onSubmit={handleDeployProject}>
        <FieldGroup>
          <FieldSet>
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>
                  <Link
                    href={`https://github.com/${repo.get("repo")}`}
                    target="_blank"
                  >
                    {repo.get("repo")}
                  </Link>
                </ItemTitle>

                <ItemDescription className="flex items-center gap-1">
                  <GitBranchIcon size="16" /> {repo.get("branch")}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant="outline" size="sm">
                  Action
                </Button>
              </ItemActions>
            </Item>

            <FieldLegend className="font-bold text-2xl mt-6">
              New Project
            </FieldLegend>

            <FieldDescription>
              Provide project details to deploy your app.
            </FieldDescription>

            <FieldGroup className="space-y-1 mt-2">
              <Field>
                <FieldLabel>Project Name</FieldLabel>
                <Input name="project-name" required placeholder="Ship-It" />
              </Field>

              <Field>
                <FieldLabel>Framework</FieldLabel>
                <Select name="framework">
                  <SelectTrigger>
                    <SelectValue placeholder="Select framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nextjs">Next.js</SelectItem>
                    <SelectItem value="react">React</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <FieldSeparator />

              <Field>
                <FieldLabel>Root Directory</FieldLabel>
                <Input name="root-directory" placeholder="./" />
              </Field>

              <FieldSeparator />

              <Field>
                <FieldLabel>Build Command</FieldLabel>
                <Input name="build-command" placeholder="npm run build" />
              </Field>

              <Field>
                <FieldLabel>Output Directory</FieldLabel>
                <Input name="output-directory" placeholder="dist" />
              </Field>

              <Field>
                <FieldLabel>Install Command</FieldLabel>
                <Input name="install-command" placeholder="npm install" />
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator />

          <Field orientation="horizontal">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>

            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}

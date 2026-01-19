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

export default function CreateNewProjectForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const repoUrl = searchParams.get("url");
  const branch = searchParams.get("branch") ?? "main";

  if (!owner || !repo || !repoUrl) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl text-muted-foreground">
          Invalid GitHub import link
        </p>
      </div>
    );
  }

  const [framework, setFramework] = useState<
    "NONE" | "NEXTJS" | "REACT" | "VITE" | "NODE"
  >("NONE");
  const [buildCommand, setBuildCommand] = useState<string>("");

  useEffect(() => {
    switch (framework) {
      case "NEXTJS":
        setBuildCommand("npm run build");
        break;
      case "REACT":
      case "VITE":
        setBuildCommand("npm run build");
        break;
      case "NODE":
        setBuildCommand("");
        break;
      default:
        setBuildCommand("");
    }
  }, [framework]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();

      const response = await clientAxios.post("/projects", {
        name: repo,
        repoUrl: repoUrl,
        owner: owner,
        repoName: repo,
        branch: branch,
        framework: framework,
        buildCommand: buildCommand,
      });

      if (response.status === 201) {
        toast.success("Project created successfully");
        router.push(`/projects/${response.data.data.id}`);
      }
    } catch (error) {
      console.log("Error creating project", error);
    }
  };

  return (
    <div className="flex flex-1 justify-center text-start">
      <div className="w-full max-w-md px-6 py-12 h-fit">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <FieldSet>
            <FieldLegend>
              <span className="text-2xl font-bold">New Project</span>
            </FieldLegend>
            <FieldDescription className="text-muted-foreground">
              Import your project from GitHub
            </FieldDescription>

            <FieldSet>
              <FieldLegend>{owner}</FieldLegend>
              <FieldDescription>
                <Link
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <span className="font-medium">{repo}</span>
                  <span className="flex items-center gap-2 text-xs">
                    <GitBranch size={14} />
                    {branch}
                  </span>
                </Link>
              </FieldDescription>
            </FieldSet>

            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
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

              <Field>
                <FieldLabel>Build Command</FieldLabel>
                <Input
                  name="buildCommand"
                  placeholder="npm run build"
                  value={buildCommand}
                  onChange={(e) => setBuildCommand(e.target.value)}
                />
                <FieldDescription>
                  Leave empty if no build step is required.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Install Command</FieldLabel>
                <Input
                  name="installCommand"
                  defaultValue="npm run install"
                  placeholder="npm install"
                />
              </Field>

              <Field>
                <FieldLabel>Root Directory</FieldLabel>
                <Input name="rootDir" defaultValue="./" placeholder="./" />
                <FieldDescription>
                  Path to project root relative to repository.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <input type="hidden" name="owner" value={owner} />
            <input type="hidden" name="repoName" value={repo} />
            <input type="hidden" name="branch" value={branch} />
          </FieldSet>

          <Button type="submit">Create Project</Button>
        </form>
      </div>
    </div>
  );
}

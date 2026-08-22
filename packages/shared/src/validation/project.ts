// Shared by both project write paths — create (Express) and update (web route
// handler) — so a value rejected by one is rejected by the other. No Node imports.
import { z } from "zod";

export const FRAMEWORKS = ["NEXTJS", "REACT", "VITE", "NODE", "NONE"] as const;

const MAX_PATH_LENGTH = 255;
const MAX_COMMAND_LENGTH = 500;

// Mirrors `resolveWithin()` in shipyard. `null` = escapes the base, so
// `apps/../apps/site` passes and `../secrets` doesn't.
function resolveSegments(value: string): string[] | null {
  const out: string[] = [];

  for (const part of value.split("/")) {
    if (!part || part === ".") continue;
    if (part !== "..") {
      out.push(part);
      continue;
    }
    if (!out.length) return null;
    out.pop();
  }

  return out;
}

// Rejected here so the user sees it on Save, not minutes into a build.
// Shipyard re-checks at build time, where symlinks resolve too.
const repoPath = (label: string) =>
  z
    .string()
    .max(MAX_PATH_LENGTH, `${label} is too long`)
    .refine((v) => !v.includes("\0"), `${label} contains an invalid character`)
    .refine(
      (v) => !/^([a-zA-Z]:)?[\\/]/.test(v),
      `${label} must be relative to the repository root, not an absolute path`,
    )
    .refine((v) => !v.includes("\\"), `${label} must use forward slashes`)
    .refine(
      (v) => resolveSegments(v) !== null,
      `${label} must stay inside the repository — remove the leading ".." segments`,
    );

// Newlines would smuggle extra lines past the single command echoed to the
// build log. The command itself is meant to be arbitrary — it runs in the
// user's own throwaway container — so this is about honest logs, not sandboxing.
const command = (label: string) =>
  z
    .string()
    .max(MAX_COMMAND_LENGTH, `${label} is too long`)
    .refine((v) => !/[\n\r\0]/.test(v), `${label} must be a single line`);

const branch = z
  .string()
  .trim()
  .min(1, "Production branch is required")
  .max(255, "Branch name is too long")
  .refine((v) => !/[\s\0]/.test(v), "Branch name cannot contain spaces");

const projectName = z
  .string()
  .trim()
  .min(1, "Project name is required")
  .max(100, "Project name is too long");

const buildConfig = {
  framework: z.enum(FRAMEWORKS, { message: "Unknown framework" }),
  buildCommand: command("Build command"),
  installCommand: command("Install command"),
  rootDir: repoPath("Root directory"),
  outputDir: repoPath("Output directory"),
};

export const createProjectSchema = z.object({
  name: projectName,
  repoUrl: z.string().trim().min(1, "Repository URL is required").max(500),
  owner: z.string().trim().min(1, "Repository owner is required").max(100),
  // The form posts the repo name as `project`; the column is `repoName`.
  project: z.string().trim().min(1, "Repository name is required").max(100),
  branch: branch.default("main"),
  framework: buildConfig.framework.nullish(),
  buildCommand: buildConfig.buildCommand.nullish(),
  installCommand: buildConfig.installCommand.nullish(),
  rootDir: buildConfig.rootDir.nullish(),
  outputDir: buildConfig.outputDir.nullish(),
  // Validated by `normalizeEnvVars()`, which also de-duplicates.
  envVars: z.unknown().optional(),
});

// Patch semantics: only fields actually sent are validated and written, so the
// general and build settings forms save independently.
export const updateProjectSchema = z.object({
  name: projectName.optional(),
  description: z.string().max(500, "Description is too long").nullish(),
  branch: branch.optional(),
  framework: buildConfig.framework.optional(),
  buildCommand: buildConfig.buildCommand.optional(),
  installCommand: buildConfig.installCommand.optional(),
  rootDir: buildConfig.rootDir.optional(),
  outputDir: buildConfig.outputDir.optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** One actionable sentence for the API response, not a serialised issue tree. */
export function firstValidationError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";

  const field = issue.path.join(".");
  const message = issue.message;
  // Ours already name the field in prose ("Output directory must…"); zod's
  // built-in ones don't, so only those get the prefix.
  const flatten = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return field && !flatten(message).includes(flatten(field))
    ? `${field}: ${message}`
    : message;
}

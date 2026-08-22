import simpleGit from "simple-git";
import path from "path";
import { Prisma } from "@repo/db";
import fs from "fs";

// Type for deployment with all necessary relations
type DeploymentWithRelations = Prisma.DeploymentGetPayload<{
  include: {
    project: {
      include: {
        user: {
          include: {
            accounts: true;
          };
        };
      };
    };
  };
}>;

/**
 * Env var the credential helper reads the token out of. Named rather than
 * inlined so the helper snippet below and the `.env()` call can't drift.
 */
const TOKEN_ENV_VAR = "SHIPIT_GIT_TOKEN";

// Inline shell function git runs only when the remote asks for auth, reading
// username/password off stdout. The shell expands the token from the env at that
// moment — never an argument, never in the URL, never persisted.
const CREDENTIAL_HELPER = `!f() { echo username=oauth2; echo "password=$${TOKEN_ENV_VAR}"; }; f`;

export const cloneRepo = async (deployment: DeploymentWithRelations) => {
  const githubAccountToken = deployment.project.user.accounts[0]?.accessToken;
  if (!githubAccountToken) {
    throw new Error("No GitHub OAuth access token found for this user.");
  }

  const repoUrl = deployment.project.repoUrl;

  // Status transitions are owned by the worker loop (see shipyard/src/index.ts) —
  // don't set CLONING again here.
  //
  // The token is handed to git through a credential helper reading an env var,
  // never through the URL. A tokenized URL leaks into `git` error messages, the
  // process list (`ps` shows every argument), and `<clone>/.git/config`; this
  // form appears in none of them. `-c` is per-invocation, so the helper is not
  // written into the clone's config either.
  const git = simpleGit({
    config: [`credential.helper=${CREDENTIAL_HELPER}`],
  }).env({ ...process.env, [TOKEN_ENV_VAR]: githubAccountToken });

  const repoRoot = path.join(process.cwd(), "repositories");
  const cloneDir = path.join(repoRoot, deployment.id);

  if (!fs.existsSync(repoRoot)) {
    fs.mkdirSync(repoRoot, { recursive: true });
  }

  if (fs.existsSync(cloneDir)) {
    fs.rmSync(cloneDir, { recursive: true, force: true });
  }

  await git.clone(repoUrl, cloneDir, [
    "--branch",
    deployment.branch,
    "--single-branch",
  ]);

  return cloneDir;
};

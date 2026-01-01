import fs from "fs";
import path from "path";
import simpleGit from "simple-git";

export default async function cloneRepository(
  updatedDeployment: { project: { repoUrl: string } },
  deploymentId: string,
) {
  const appRoot = path.join(__dirname, ".."); // apps/shipyard
  const repoRoot = path.join(appRoot, "repositories");
  const cloneDir = path.join(repoRoot, deploymentId); // apps/shipyard/repositories/<id>

  if (!fs.existsSync(repoRoot)) {
    fs.mkdirSync(repoRoot, { recursive: true });
  }

  // Remove old clone if exists
  if (fs.existsSync(cloneDir)) {
    fs.rmSync(cloneDir, { recursive: true, force: true });
  }

  const git = simpleGit();

  console.log("Cloning into:", cloneDir);

  await git.clone(updatedDeployment.project.repoUrl, cloneDir);

  return cloneDir;
}

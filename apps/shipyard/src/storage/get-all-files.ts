import fs from "fs";
import path from "path";
import { realpathOrSelf } from "../paths.js";

/**
 * Never publish these, even if they sit inside the output directory. A project
 * whose output dir is the repo root (a plain static site with no build step)
 * would otherwise upload the `.env` we inject and serve it to the world.
 */
const isSecretFile = (name: string) =>
  name === ".env" || name.startsWith(".env.");
// Skipped by name, not because a build would emit them: a static site publishes
// the repo root, where a committed node_modules would mean thousands of junk
// objects in the bucket.
const isSkippedDir = (name: string) =>
  name === ".git" || name === "node_modules";

const isInside = (candidate: string, root: string) =>
  candidate === root || candidate.startsWith(root + path.sep);

// Every file under `dirPath`, bounded by `root`. The build runs arbitrary
// commands, so the output dir can hold `ln -s ~/.ssh out/keys` — following that
// would upload the target to a public bucket.
export const getAllFiles = (
  dirPath: string,
  arrayOfFiles: string[] = [],
  root: string = realpathOrSelf(path.resolve(dirPath)),
) => {
  for (const name of fs.readdirSync(dirPath)) {
    const full = path.join(dirPath, name);

    // lstat, not stat — inspect the link itself rather than its target.
    if (fs.lstatSync(full).isSymbolicLink()) {
      let target: string;
      try {
        target = fs.realpathSync(full);
      } catch {
        continue; // broken link
      }
      if (!isInside(target, root)) continue;
    }

    let entry: fs.Stats;
    try {
      entry = fs.statSync(full);
    } catch {
      continue;
    }

    if (entry.isDirectory()) {
      if (isSkippedDir(name)) continue;
      getAllFiles(full, arrayOfFiles, root);
    } else if (entry.isFile()) {
      if (isSecretFile(name)) continue;
      arrayOfFiles.push(full);
    }
  }

  return arrayOfFiles;
};

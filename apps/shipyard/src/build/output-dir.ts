import fs from "fs";
import path from "path";
import { resolveWithin } from "../paths.js";

// Directories we look at when the project doesn't declare an output dir.
// `.next` is deliberately absent — a raw `.next` dir is not servable as static
// files, see resolveOutputDir().
const OUTPUT_DIR_CANDIDATES = ["dist", "build", "out"];

/** Directories the build actually produced, for an error the user can act on. */
function producedDirs(buildPath: string): string[] {
  try {
    return fs
      .readdirSync(buildPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .filter((e) => e.name !== "node_modules")
      .map((e) => e.name);
  } catch {
    return [];
  }
}

// Which directory to upload. No Node runtime, so a Next project only deploys if
// built with `output: "export"` (a static `out/`). `prepareNextProject()` sets
// that up; a bare `.next` with no static output fails loudly rather than
// uploading something that can never be served.
export function resolveOutputDir(
  buildPath: string,
  outputDir: string,
  isNext: boolean,
): string {
  if (outputDir) {
    // Contained, not joined — this directory gets uploaded to a public bucket.
    const explicit = resolveWithin(
      buildPath,
      outputDir,
      "output directory",
    ).absolute;
    if (!fs.existsSync(explicit)) {
      const produced = producedDirs(buildPath);
      throw new Error(
        `Configured output directory "${outputDir}" does not exist after the build.` +
          (produced.length
            ? ` The build produced: ${produced.join(", ")}. Update the project's ` +
              "output directory in settings to match."
            : ""),
      );
    }
    return explicit;
  }

  // Next static export lands in `out`, so check it first for Next projects.
  const candidates = isNext
    ? ["out", ...OUTPUT_DIR_CANDIDATES.filter((c) => c !== "out")]
    : OUTPUT_DIR_CANDIDATES;

  for (const candidate of candidates) {
    const dir = path.join(buildPath, candidate);
    if (fs.existsSync(dir)) return dir;
  }

  if (fs.existsSync(path.join(buildPath, ".next"))) {
    throw new Error(
      "Found a .next directory but no static output. ShipIt serves static files " +
        'from S3 and cannot run a Next.js server. Set `output: "export"` in ' +
        "next.config.js (which emits `out/`), or set the project's output " +
        "directory to a folder of static files.",
    );
  }

  throw new Error(
    `No build output found. Looked for ${candidates.join(", ")} in ${buildPath}. ` +
      "Set the project's output directory if your build writes somewhere else.",
  );
}

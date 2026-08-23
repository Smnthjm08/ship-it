import path from "path";
import { uploadFile } from "./s3.js";

// Bounded concurrency: sequential costs a round trip per file, while Promise.all
// over a large export would open thousands of sockets and read every file into
// memory. First failure stops the rest and rethrows — a partial upload is a
// broken site, so the build must fail rather than publish it.
const UPLOAD_CONCURRENCY = 8;

export async function uploadBuildArtifacts(
  files: string[],
  distFolder: string,
  deploymentId: string,
): Promise<void> {
  let cursor = 0;
  let failure: unknown = null;

  const worker = async () => {
    for (;;) {
      if (failure) return;
      const index = cursor++;
      if (index >= files.length) return;

      const file = files[index]!;
      const relativePath = path.relative(distFolder, file).replace(/\\/g, "/");
      try {
        await uploadFile(`${deploymentId}/${relativePath}`, file);
      } catch (error) {
        failure ??= error;
        return;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker),
  );

  if (failure) throw failure;
}

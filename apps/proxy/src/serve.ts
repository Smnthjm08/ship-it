import path from "node:path";
import { Readable } from "node:stream";
import type { Request, Response } from "express";
import {
  GetObjectCommand,
  HeadObjectCommand,
  type GetObjectCommandOutput,
  type HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { createS3Client, getBucketName } from "@repo/shared/aws/s3";
import mime from "mime-types";

const s3 = createS3Client();

/** Hashed filenames never change, so cache forever. Everything else revalidates. */
const IMMUTABLE_PREFIX = /^\/(?:_next\/static|_astro|assets|static)\//;
const HASHED_FILENAME =
  /[.-][A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)$/;

const HTML_CACHE_CONTROL = "public, max-age=0, must-revalidate";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const DEFAULT_CACHE_CONTROL = "public, max-age=3600, must-revalidate";

function cacheControlFor(filePath: string): string {
  if (filePath.endsWith(".html")) return HTML_CACHE_CONTROL;
  if (IMMUTABLE_PREFIX.test(filePath) || HASHED_FILENAME.test(filePath)) {
    return IMMUTABLE_CACHE_CONTROL;
  }
  return DEFAULT_CACHE_CONTROL;
}

type ObjectMeta = Pick<
  HeadObjectCommandOutput,
  "ContentLength" | "ETag" | "LastModified"
>;

type FetchResult =
  | { kind: "hit"; meta: ObjectMeta; body: Readable | null }
  | { kind: "not-modified"; meta: ObjectMeta }
  | { kind: "miss" };

/** A missing key is a normal outcome; anything else is a real failure worth surfacing. */
function isMissing(error: unknown): boolean {
  const err = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    err?.$metadata?.httpStatusCode === 404 ||
    err?.name === "NoSuchKey" ||
    err?.name === "NotFound"
  );
}

function isNotModified(error: unknown): boolean {
  const err = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return err?.$metadata?.httpStatusCode === 304 || err?.name === "NotModified";
}

// Forwards conditional headers (unchanged asset = 304) and answers HEAD with
// HeadObject. Throws on anything that isn't a clean miss so the caller can 502 —
// treating a bad bucket as "not found" makes it look like a working site.
async function fetchObject(
  key: string,
  req: Request,
  headOnly: boolean,
): Promise<FetchResult> {
  const conditions = {
    IfNoneMatch: req.headers["if-none-match"],
    IfModifiedSince: req.headers["if-modified-since"]
      ? new Date(req.headers["if-modified-since"])
      : undefined,
  };
  // An unparseable If-Modified-Since must be ignored, not sent on to S3.
  if (
    conditions.IfModifiedSince &&
    Number.isNaN(conditions.IfModifiedSince.getTime())
  ) {
    conditions.IfModifiedSince = undefined;
  }

  const input = { Bucket: getBucketName(), Key: key, ...conditions };

  try {
    if (headOnly) {
      const out: HeadObjectCommandOutput = await s3.send(
        new HeadObjectCommand(input),
      );
      return { kind: "hit", meta: out, body: null };
    }
    const out: GetObjectCommandOutput = await s3.send(
      new GetObjectCommand(input),
    );
    return { kind: "hit", meta: out, body: (out.Body as Readable) ?? null };
  } catch (error) {
    if (isNotModified(error)) return { kind: "not-modified", meta: {} };
    if (isMissing(error)) return { kind: "miss" };
    throw error;
  }
}

function setHeaders(res: Response, filePath: string, meta: ObjectMeta) {
  res.setHeader(
    "Content-Type",
    mime.contentType(path.posix.basename(filePath)) ||
      "application/octet-stream",
  );
  res.setHeader("Cache-Control", cacheControlFor(filePath));
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (meta.ETag) res.setHeader("ETag", meta.ETag);
  if (meta.LastModified)
    res.setHeader("Last-Modified", meta.LastModified.toUTCString());
  if (meta.ContentLength !== undefined) {
    res.setHeader("Content-Length", String(meta.ContentLength));
  }
}

function send(
  res: Response,
  filePath: string,
  result: FetchResult,
  status = 200,
) {
  if (result.kind === "not-modified") {
    res.setHeader("Cache-Control", cacheControlFor(filePath));
    res.status(304).end();
    return;
  }
  if (result.kind === "miss") return;

  setHeaders(res, filePath, result.meta);

  if (!result.body) {
    res.status(status).end();
    return;
  }

  res.status(status);
  // Headers are already on the wire by the time a stream can fail, so there is
  // no way to turn this into an error page — just tear the response down.
  // Without this handler the unhandled 'error' event takes the whole proxy
  // (and every site it serves) down with it.
  result.body.on("error", (err) => {
    console.error("Stream error while serving", filePath, err);
    res.destroy(err);
  });
  res.on("close", () => result.body?.destroy());
  result.body.pipe(res);
}

// Candidates in priority order. SSGs emit clean URLs as either `about.html` or
// `about/index.html`; try both or every multi-page export serves its homepage.
function candidatesFor(filePath: string): string[] {
  if (filePath.endsWith("/")) return [`${filePath}index.html`];
  if (path.posix.extname(filePath)) return [filePath];
  return [filePath, `${filePath}.html`, `${filePath}/index.html`];
}

/** Decode and normalise the request path, or null if it is malformed or escapes the prefix. */
function normalisePath(rawPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  if (decoded.includes("\0")) return null;

  const trailingSlash = decoded.endsWith("/") && decoded !== "/";
  const normalised = path.posix.normalize(decoded);
  if (normalised.startsWith("..")) return null;

  return trailingSlash && !normalised.endsWith("/")
    ? `${normalised}/`
    : normalised;
}

/** True when this request is a browser navigation that a SPA shell can answer. */
function wantsHtmlDocument(req: Request, filePath: string): boolean {
  const ext = path.posix.extname(filePath);
  if (ext && ext !== ".html") return false;
  return (req.headers.accept || "").includes("text/html");
}

export async function serveDeployment(
  deploymentId: string,
  req: Request,
  res: Response,
): Promise<void> {
  const filePath = normalisePath(req.path === "/" ? "/index.html" : req.path);
  if (!filePath) {
    res.status(400).send("Bad request");
    return;
  }

  const headOnly = req.method === "HEAD";

  for (const candidate of candidatesFor(filePath)) {
    const result = await fetchObject(
      `${deploymentId}${candidate}`,
      req,
      headOnly,
    );
    if (result.kind !== "miss") {
      send(res, candidate, result);
      return;
    }
  }

  // Nothing matched. Only a navigation gets a fallback — answering a missing
  // `.js` or `.css` with index.html is what produces "Unexpected token '<'" in
  // the console and a blank page, with a 200 that hides the problem.
  if (wantsHtmlDocument(req, filePath) && filePath !== "/index.html") {
    // A build that ships `404.html` (Next export, Astro, Hugo…) is a multi-page
    // site that has told us what an unknown URL should look like — honour it,
    // with a real 404. Only a build without one is treated as a SPA whose shell
    // handles client-side routing, which is the one case that gets a 200.
    const notFoundPage = await fetchObject(
      `${deploymentId}/404.html`,
      req,
      headOnly,
    );
    if (notFoundPage.kind !== "miss") {
      send(res, "/404.html", notFoundPage, 404);
      return;
    }

    const shell = await fetchObject(
      `${deploymentId}/index.html`,
      req,
      headOnly,
    );
    if (shell.kind !== "miss") {
      // Served under the HTML policy (max-age=0, must-revalidate): the shell is
      // cacheable but always revalidated, so if a later deployment adds a real
      // page at this URL the client picks it up on the next request.
      send(res, "/index.html", shell);
      return;
    }
  }

  res
    .status(404)
    .type("html")
    .send(
      errorPage(
        "404",
        "File not found",
        `<code>${escapeHtml(filePath)}</code> is not part of this deployment.`,
      ),
    );
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

/** Small shared shell for the proxy's own responses (never a user's content). */
export function errorPage(code: string, title: string, detail: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
             background:#0b0b0b; color:#ededed; font:400 15px/1.6 ui-sans-serif,system-ui,-apple-system,sans-serif; }
      main { max-width:32rem; padding:2rem; text-align:center; }
      .code { font-size:.75rem; letter-spacing:.08em; text-transform:uppercase; color:#8a8a8a; }
      h1 { margin:.5rem 0 .75rem; font-size:1.5rem; font-weight:600; letter-spacing:-.02em; }
      p { margin:0; color:#a1a1a1; }
      code { background:#1a1a1a; padding:.15rem .35rem; border-radius:4px; font-size:.85em; }
    </style>
  </head>
  <body>
    <main>
      <p class="code">${escapeHtml(code)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${detail}</p>
    </main>
  </body>
</html>`;
}

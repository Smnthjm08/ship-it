// Client mirror of `@repo/shared/env/vars`, kept separate so the browser bundle
// doesn't pull in a server package. The API re-validates; this is for feedback.

export const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface EnvVarRow {
  key: string;
  value: string;
  /**
   * True for a variable that already exists on the server. Its value is never
   * sent to the browser, so an empty `value` means "leave it as it is".
   */
  stored?: boolean;
}

export function isValidEnvKey(key: string): boolean {
  return ENV_KEY_PATTERN.test(key);
}

/** Parse a pasted `.env` blob. Mirrors the parser the build worker uses. */
export function parseDotEnv(text: string): { key: string; value: string }[] {
  // Plain array rather than a Map so this compiles under the web app's
  // ES5-friendly target without --downlevelIteration.
  const out: { key: string; value: string }[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ")
      ? line.slice(7).trim()
      : line;
    const eq = withoutExport.indexOf("=");
    if (eq <= 0) continue;

    const key = withoutExport.slice(0, eq).trim();
    if (!ENV_KEY_PATTERN.test(key)) continue;

    let value = withoutExport.slice(eq + 1).trim();
    const quote = value[0];
    if (
      (quote === '"' || quote === "'") &&
      value.endsWith(quote) &&
      value.length > 1
    ) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, "\n");
    } else {
      const comment = value.indexOf(" #");
      if (comment !== -1) value = value.slice(0, comment).trim();
    }

    // A key repeated in the same blob keeps its last value, like dotenv.
    const existing = out.findIndex((entry) => entry.key === key);
    if (existing >= 0) out[existing] = { key, value };
    else out.push({ key, value });
  }

  return out;
}

/**
 * Turn editor rows into the API payload. Blank rows are dropped; a stored row
 * left untouched is sent without a value so the server keeps the secret.
 */
export function toEnvVarPayload(
  rows: EnvVarRow[],
): { key: string; value?: string }[] {
  return rows
    .filter((row) => row.key.trim() && (row.value !== "" || row.stored))
    .map((row) =>
      row.value === "" && row.stored
        ? { key: row.key.trim() }
        : { key: row.key.trim(), value: row.value },
    );
}

/** First validation problem in the rows, or `null` when they're all fine. */
export function findEnvVarError(rows: EnvVarRow[]): string | null {
  const seen = new Set<string>();

  for (const row of rows) {
    const key = row.key.trim();
    if (!key) {
      // A completely empty row is just an unused slot.
      if (row.value) return "Every value needs a variable name.";
      continue;
    }
    if (!isValidEnvKey(key)) {
      return `"${key}" isn't a valid name — use letters, digits and underscores, and don't start with a digit.`;
    }
    if (seen.has(key)) return `"${key}" is listed twice.`;
    seen.add(key);

    if (!row.stored && row.value === "") return `"${key}" needs a value.`;
  }

  return null;
}

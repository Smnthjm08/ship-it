import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

// Authenticated encryption for values we must read back — project env vars,
// decrypted by Shipyard at build time. Format `v1.<iv>.<authTag>.<ciphertext>`,
// base64; the version prefix lets the scheme rotate without guessing at old rows.
const VERSION = "v1";
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32; // AES-256

let cachedKey: Buffer | null = null;

// Prefers ENV_SECRET_KEY, falling back to one derived from BETTER_AUTH_SECRET so
// a self-hosted install works unconfigured. Rotating either makes existing
// ciphertext undecryptable — the derived key is a convenience, not a recommendation.
function resolveKey(): Buffer {
  if (cachedKey) return cachedKey;

  const explicit = process.env.ENV_SECRET_KEY?.trim();
  if (explicit) {
    const decoded = /^[0-9a-fA-F]{64}$/.test(explicit)
      ? Buffer.from(explicit, "hex")
      : Buffer.from(explicit, "base64");
    if (decoded.length !== KEY_BYTES) {
      throw new Error(
        `ENV_SECRET_KEY must decode to ${KEY_BYTES} bytes (64 hex chars or base64). ` +
          `Generate one with: openssl rand -hex 32`,
      );
    }
    cachedKey = decoded;
    return cachedKey;
  }

  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret) {
    throw new Error(
      "Cannot encrypt environment variables: set ENV_SECRET_KEY (openssl rand -hex 32) " +
        "or BETTER_AUTH_SECRET.",
    );
  }

  cachedKey = Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(authSecret, "utf8"),
      Buffer.from("shipit.env-var.v1", "utf8"),
      Buffer.from("shipit-env-var-encryption", "utf8"),
      KEY_BYTES,
    ),
  );
  return cachedKey;
}

/** Encrypt a value for storage. Never log or return the input alongside this. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", resolveKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

/**
 * Decrypt a stored value. Throws if the payload was tampered with or was
 * written under a different key — callers should surface that as a build
 * failure rather than silently deploying without the variable.
 */
export function decryptSecret(payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Malformed encrypted value");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    resolveKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Reset the memoised key. Only useful in tests / after a key rotation. */
export function resetSecretKeyCache(): void {
  cachedKey = null;
}

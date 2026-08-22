import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/db";

// The callback is served by whatever sits at BETTER_AUTH_URL — the Next app, not
// the backend. This exact URL must be registered on the GitHub OAuth App.
const baseURL = process.env.BETTER_AUTH_URL;

export const GITHUB_CALLBACK_URL = `${baseURL ?? "http://localhost:3000"}/api/auth/callback/github`;

if (!baseURL) {
  console.warn(
    `[auth] BETTER_AUTH_URL is not set — falling back to http://localhost:3000. ` +
      `Set it to the origin serving /api/auth, and register ${GITHUB_CALLBACK_URL} ` +
      `as the GitHub OAuth App's Authorization callback URL.`,
  );
}

// GitHub App client ids look like "Iv23li…" / "Iv1.…"; OAuth App ids are 20 hex
// chars. They are not interchangeable: a GitHub App ignores the `repo` scope
// below and issues short-lived user-to-server tokens that only reach repos where
// the App is installed, which is not enough for Shipyard to clone.
const clientId = process.env.GITHUB_CLIENT_ID as string;
if (clientId && /^Iv(1\.|23li)/.test(clientId)) {
  console.warn(
    `[auth] GITHUB_CLIENT_ID "${clientId}" belongs to a GitHub App, but this ` +
      `project is built against a GitHub OAuth App. Create one under ` +
      `Settings → Developer settings → OAuth Apps with callback URL ` +
      `${GITHUB_CALLBACK_URL}, or private-repo cloning will not work.`,
  );
}

export const auth = betterAuth({
  // Pin the base URL rather than letting better-auth infer it per request, so the
  // redirect_uri sent to GitHub is always the one documented above.
  baseURL,
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "sqlite"
  }),
  socialProviders: {
    github: {
      clientId,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scope: ["repo", "read:user", "user:email"],
      /**
       * GitHub users with "Keep my email addresses private" enabled return a
       * null email from the /user endpoint. Better Auth throws `email_not_found`
       * in that case. We fall back to GitHub's guaranteed noreply address
       * ({id}+{login}@users.noreply.github.com) so sign-in always succeeds.
       */
      getUserInfo: async (token) => {
        const profileRes = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            Accept: "application/vnd.github+json",
          },
        });
        if (!profileRes.ok) return null;
        const profile = (await profileRes.json()) as Record<string, unknown>;

        const email =
          (profile.email as string | null) ??
          `${profile.id}+${profile.login}@users.noreply.github.com`;

        return {
          user: {
            id: String(profile.id),
            name: (profile.name as string) || (profile.login as string),
            email,
            image: profile.avatar_url as string | undefined,
            emailVerified: !!profile.email, // only mark verified if GitHub returned a real email
          },
          data: profile,
        };
      },
    },
  },
});

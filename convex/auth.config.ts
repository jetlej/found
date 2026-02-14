/**
 * Convex auth configuration for Clerk JWT validation.
 *
 * SETUP (one-time manual steps):
 * 1. Clerk Dashboard → JWT Templates → New Template → select "Convex" preset
 *    (keep the name "convex" — do NOT rename it)
 * 2. Copy the Issuer URL (e.g. https://verb-noun-00.clerk.accounts.dev)
 * 3. Convex Dashboard → Settings → Environment Variables →
 *    set CLERK_JWT_ISSUER_DOMAIN = <issuer URL from step 2>
 * 4. Run `bunx convex dev` to push this config
 */
import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

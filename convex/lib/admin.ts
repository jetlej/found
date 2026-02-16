type AuthContext = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
};

function getAdminSecret(): string {
  const secret = (process.env.ADMIN_SECRET ?? "").trim();
  if (!secret) throw new Error("ADMIN_SECRET is not configured");
  return secret;
}

export async function requireAdmin(
  _ctx: AuthContext,
  providedSecret?: string,
): Promise<string> {
  const expectedSecret = getAdminSecret();
  if (!providedSecret || providedSecret !== expectedSecret) {
    throw new Error("Forbidden");
  }
  return "secret";
}


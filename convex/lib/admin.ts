import { QueryCtx, MutationCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';

type AuthContext = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
};

function getAdminSecret(): string {
  const secret = (process.env.ADMIN_SECRET ?? '').trim();
  if (!secret) throw new Error('ADMIN_SECRET is not configured');
  return secret;
}

export async function requireAdmin(_ctx: AuthContext, providedSecret?: string): Promise<string> {
  const expectedSecret = getAdminSecret();
  if (!providedSecret || providedSecret !== expectedSecret) {
    throw new Error('Forbidden');
  }
  return 'secret';
}

export function assertOwnerOrAdmin(
  caller: { _id: Id<'users'>; role?: string },
  targetUserId: Id<'users'>
) {
  if (caller._id !== targetUserId && caller.role !== 'admin') {
    throw new Error('Forbidden');
  }
}

export async function requireAdminRole(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', identity.subject))
    .first();
  if (!user || user.role !== 'admin') throw new Error('Forbidden');
  return user;
}

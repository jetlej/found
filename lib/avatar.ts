/**
 * Get avatar URL with Pravatar fallback for users without a custom avatar
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  uniqueId: string,
  size: number = 150
): string {
  if (avatarUrl) return avatarUrl;
  return `https://i.pravatar.cc/${size}?u=${uniqueId}`;
}


import { copy } from "@/constants/copy";
import { resolveMediaUrl } from "@/lib/api/http";

/** Resolve uploaded avatar, or fall back to the default Etude avatar. */
export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
): string {
  return resolveMediaUrl(avatarUrl) ?? copy.defaultAvatar;
}

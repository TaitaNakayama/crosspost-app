import type { ConnectedAccount } from "@prisma/client";

/**
 * The client never receives platform tokens. Every response carrying a
 * ConnectedAccount goes through here so a token cannot leak by accident.
 */
export function publicAccount(account: ConnectedAccount) {
  return {
    id: account.id,
    platform: account.platform,
    displayName: account.displayName,
    handle: account.handle,
    avatarUrl: account.avatarUrl,
    status: account.status,
  };
}

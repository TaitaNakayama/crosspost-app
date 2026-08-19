/**
 * Backend client. The app never holds platform tokens — it talks only to our
 * API, which owns every ConnectedAccount token and makes all publish calls.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export type Platform = "x" | "threads" | "instagram" | "tiktok" | "linkedin";
export type AccountStatus = "active" | "needs_reauth" | "revoked";
export type PostTargetStatus = "queued" | "publishing" | "published" | "failed";

export interface ConnectedAccount {
  id: string;
  platform: Platform;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  status: AccountStatus;
}

export interface PostTarget {
  id: string;
  connectedAccountId: string;
  status: PostTargetStatus;
  platformPostId: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
}

export interface Post {
  id: string;
  caption: string;
  targets: PostTarget[];
}

// TODO: replace with the real session token once auth exists.
function authHeaders(userId: string): Record<string, string> {
  return { "x-user-id": userId };
}

async function request<T>(path: string, userId: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(userId),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function listAccounts(userId: string) {
  return request<ConnectedAccount[]>("/accounts", userId);
}

export function createPost(
  userId: string,
  input: { caption: string; connectedAccountIds: string[] }
) {
  return request<Post>("/posts", userId, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPost(userId: string, postId: string) {
  return request<Post>(`/posts/${postId}`, userId);
}

import type { Agent } from "@/types";
import { apiFetch } from "@/lib/api/client";

export type AvatarGenerationVariant = "mc-monkey-local-pool";

export interface GenerateAvatarResult {
  avatarUrl: string;
  prompt: string;
  variant: AvatarGenerationVariant;
}

export const AVATAR_STORAGE_KEY = "mission-control-agent-avatars";
const MC_MONKEY_POOL_USED_KEY = "mission-control-mc-monkey-used";

function readUsedMonkeysFromStorage(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(MC_MONKEY_POOL_USED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function saveUsedMonkeysToStorage(used: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MC_MONKEY_POOL_USED_KEY, JSON.stringify(used));
}

function pickRandom(values: string[]): string {
  return values[Math.floor(Math.random() * values.length)] ?? values[0];
}

async function fetchLocalMcMonkeyPool(): Promise<string[]> {
  const response = await fetch("/api/mc-monkeys", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error((payload as { error?: string }).error ?? "Failed to load MC MONKEY image folder");
  }

  const payload = await response.json() as { avatars?: string[] };
  const avatars = (payload.avatars ?? []).filter((item): item is string => typeof item === "string");

  if (avatars.length === 0) {
    throw new Error("MC MONKEY pool is empty. Add images (except 00.*) to public/office/mcmonkes-library.");
  }

  return avatars;
}

async function selectRandomLocalMcMonkeyWithoutRepeat(): Promise<string> {
  const allAvatars = await fetchLocalMcMonkeyPool();
  const usedBefore = readUsedMonkeysFromStorage();
  const usedSet = new Set(usedBefore.filter((item) => allAvatars.includes(item)));

  let candidates = allAvatars.filter((item) => !usedSet.has(item));
  if (candidates.length === 0) {
    usedSet.clear();
    candidates = [...allAvatars];
  }

  const selected = pickRandom(candidates);
  usedSet.add(selected);
  saveUsedMonkeysToStorage([...usedSet]);

  return selected;
}

export function readAvatarMappingFromStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === "string") acc[key] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function saveAvatarMappingToStorage(mapping: Record<string, string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(mapping));
}

export async function persistAvatar(
  agentId: string,
  avatarUrl: string,
  prompt: string,
  variant: AvatarGenerationVariant = "mc-monkey-local-pool",
): Promise<void> {
  try {
    await apiFetch(`/api/agents/${agentId}/avatar`, {
      method: "POST",
      body: JSON.stringify({ avatarUrl, prompt, variant }),
    });
  } catch {
    // Optional endpoint: fallback persistence is handled in localStorage.
  }
}

export async function generateMcMonkeyAvatar(agent: Agent): Promise<GenerateAvatarResult> {
  const avatarUrl = await selectRandomLocalMcMonkeyWithoutRepeat();
  return {
    avatarUrl,
    prompt: `MC MONKEY local asset selected for ${agent.name}`,
    variant: "mc-monkey-local-pool",
  };
}

function isLikelyImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  const lowered = value.toLowerCase();
  return (
    lowered.startsWith("http://") ||
    lowered.startsWith("https://") ||
    lowered.startsWith("data:image/") ||
    lowered.startsWith("/")
  );
}

function normalizeAvatarUrl(rawUrl: string): string {
  if (rawUrl.startsWith("data:image/")) return rawUrl;
  if (rawUrl.startsWith("/proxy/")) return rawUrl;

  const proxyablePrefixes = ["/api/", "/uploads/", "/media/", "/storage/", "/files/"];

  if (rawUrl.startsWith("api/")) return `/proxy/${rawUrl}`;

  if (proxyablePrefixes.some((prefix) => rawUrl.startsWith(prefix))) {
    return `/proxy${rawUrl}`;
  }

  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    try {
      const parsed = new URL(rawUrl);
      const pathWithQuery = `${parsed.pathname}${parsed.search}`;
      if (proxyablePrefixes.some((prefix) => parsed.pathname.startsWith(prefix))) {
        return `/proxy${pathWithQuery}`;
      }
    } catch {
      // keep original if URL parsing fails
    }
  }

  return rawUrl;
}

function findNestedAvatarUrl(input: unknown, depth = 0): string | undefined {
  if (!input || depth > 4 || typeof input !== "object") return undefined;

  const obj = input as Record<string, unknown>;
  const preferredKeys = [
    "avatarUrl",
    "avatar_url",
    "imageUrl",
    "image_url",
    "photoUrl",
    "photo_url",
    "pictureUrl",
    "picture_url",
    "spriteUrl",
    "sprite_url",
    "url",
  ];

  for (const key of preferredKeys) {
    if (isLikelyImageUrl(obj[key])) return obj[key];
  }

  for (const [key, value] of Object.entries(obj)) {
    if (isLikelyImageUrl(value) && /(avatar|image|photo|picture|sprite)/i.test(key)) {
      return value;
    }
  }

  for (const value of Object.values(obj)) {
    const nested = findNestedAvatarUrl(value, depth + 1);
    if (nested) return nested;
  }

  return undefined;
}

export function resolveAgentAvatarUrl(agent: Agent): string | undefined {
  const dynamicAgent = agent as Agent & Record<string, unknown>;

  const directCandidates = [
    agent.avatarUrl,
    typeof dynamicAgent.avatar === "string" ? dynamicAgent.avatar : undefined,
    typeof dynamicAgent.avatar_url === "string" ? dynamicAgent.avatar_url : undefined,
    typeof dynamicAgent.imageUrl === "string" ? dynamicAgent.imageUrl : undefined,
    typeof dynamicAgent.image_url === "string" ? dynamicAgent.image_url : undefined,
    typeof dynamicAgent.photoUrl === "string" ? dynamicAgent.photoUrl : undefined,
    typeof dynamicAgent.photo_url === "string" ? dynamicAgent.photo_url : undefined,
  ];

  const direct = directCandidates.find((v): v is string => typeof v === "string" && v.length > 0);
  if (direct) return normalizeAvatarUrl(direct);

  const nested = findNestedAvatarUrl(dynamicAgent);
  return nested ? normalizeAvatarUrl(nested) : undefined;
}

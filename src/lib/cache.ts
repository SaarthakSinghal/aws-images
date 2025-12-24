import type { CacheEntry, PhotoUrlMap } from "@/types/api";

const TTL_MS = 50 * 60 * 1000; // 50 minutes

const CACHE_KEYS = {
  PERSONS: "cache:persons",
  PERSON_PHOTOS_PREFIX: "cache:personPhotos:",
  PHOTO_URL_BY_ID: "cache:photoUrlById",
  SEEN_PHOTO_IDS: "cache:seenPhotoIds",
} as const;

function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > TTL_MS;
}

export function getCachedData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (isExpired(entry.timestamp)) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn("Failed to cache data:", error);
  }
}

export function getCachedPersons<T>(): T | null {
  return getCachedData<T>(CACHE_KEYS.PERSONS);
}

export function setCachedPersons<T>(data: T): void {
  setCachedData(CACHE_KEYS.PERSONS, data);
}

export function getCachedPersonPhotos<T>(personId: string): T | null {
  return getCachedData<T>(`${CACHE_KEYS.PERSON_PHOTOS_PREFIX}${personId}`);
}

export function setCachedPersonPhotos<T>(personId: string, data: T): void {
  setCachedData(`${CACHE_KEYS.PERSON_PHOTOS_PREFIX}${personId}`, data);
}

export function getPhotoUrlMap(): PhotoUrlMap {
  return getCachedData<PhotoUrlMap>(CACHE_KEYS.PHOTO_URL_BY_ID) || {};
}

export function setPhotoUrlMap(map: PhotoUrlMap): void {
  setCachedData(CACHE_KEYS.PHOTO_URL_BY_ID, map);
}

export function updatePhotoUrlMap(photoId: string, photoURL: string): void {
  const map = getPhotoUrlMap();
  map[photoId] = photoURL;
  setPhotoUrlMap(map);
}

export function getSeenPhotoIds(): string[] {
  return getCachedData<string[]>(CACHE_KEYS.SEEN_PHOTO_IDS) || [];
}

export function setSeenPhotoIds(ids: string[]): void {
  setCachedData(CACHE_KEYS.SEEN_PHOTO_IDS, ids);
}

export function addSeenPhotoIds(newIds: string[]): void {
  const existing = new Set(getSeenPhotoIds());
  newIds.forEach((id) => existing.add(id));
  setSeenPhotoIds(Array.from(existing));
}

export function isPhotoSeen(photoId: string): boolean {
  return getSeenPhotoIds().includes(photoId);
}

export function clearAllCache(): void {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("cache:")) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function clearGlobalPhotoCache(): void {
  localStorage.removeItem(CACHE_KEYS.PHOTO_URL_BY_ID);
  localStorage.removeItem(CACHE_KEYS.SEEN_PHOTO_IDS);
}

export const CACHE_KEYS_EXPORT = CACHE_KEYS;

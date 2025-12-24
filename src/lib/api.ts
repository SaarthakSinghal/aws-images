import type { PersonsResponse, PersonPhotosResponse } from "@/types/api";

function getApiBaseUrl(): string | null {
  return import.meta.env.VITE_API_BASE_URL || null;
}

export function hasApiConfig(): boolean {
  return !!getApiBaseUrl();
}

export function getDisplayApiUrl(): string {
  const url = getApiBaseUrl();
  if (!url) return "Not configured";
  if (url.length > 40) {
    return url.substring(0, 37) + "...";
  }
  return url;
}

export function getFullApiUrl(): string {
  return getApiBaseUrl() || "";
}

export async function fetchPersons(): Promise<PersonsResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("API base URL not configured");
  }

  const response = await fetch(`${baseUrl}/persons`);
  if (!response.ok) {
    throw new Error(`Failed to fetch persons: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchPersonPhotos(personId: string): Promise<PersonPhotosResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error("API base URL not configured");
  }

  const response = await fetch(`${baseUrl}/persons/${personId}/photos`);
  if (!response.ok) {
    throw new Error(`Failed to fetch photos: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

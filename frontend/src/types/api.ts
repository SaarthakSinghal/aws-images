export interface Person {
  personId: string;
  photoCount: number;
  repThumbKey: string;
  repThumbURL: string;
}

export interface PersonsResponse {
  persons: Person[];
}

export interface Photo {
  photoId: string;
  photoBucket: string;
  photoKey: string;
  thumbKey: string;
  thumbURL?: string;
  photoURL: string;
}

export interface PersonPhotosResponse {
  personId: string;
  photos: Photo[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface PhotoUrlMap {
  [photoId: string]: string;
}

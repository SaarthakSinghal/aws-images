import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/TopBar";
import { PhotoTile, PhotoTileSkeleton } from "@/components/PhotoTile";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { fetchPersonPhotos } from "@/lib/api";
import {
  getCachedPersonPhotos,
  setCachedPersonPhotos,
  getPhotoUrlMap,
  updatePhotoUrlMap,
  getSeenPhotoIds,
  addSeenPhotoIds,
  clearGlobalPhotoCache,
} from "@/lib/cache";
import { AlertCircle, ArrowLeft, Images } from "lucide-react";
import type { Photo } from "@/types/api";

export default function PersonPage() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [previouslySeenPhotoIds, setPreviouslySeenPhotoIds] = useState<Set<string>>(new Set());

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Hydrate from cache on mount and load previously seen photo IDs
  useEffect(() => {
    if (!personId) return;

    // Load seen photo IDs BEFORE loading this person's photos
    // This captures what was seen from OTHER persons
    setPreviouslySeenPhotoIds(new Set(getSeenPhotoIds()));

    const cached = getCachedPersonPhotos<Photo[]>(personId);
    if (cached) {
      // Rehydrate with cached photo URLs
      const photoUrlMap = getPhotoUrlMap();
      const hydratedPhotos = cached.map((photo) => ({
        ...photo,
        photoURL: photoUrlMap[photo.photoId] || photo.photoURL,
      }));
      setPhotos(hydratedPhotos);
      setHasLoaded(true);
    }
  }, [personId]);

  const handleLoadImages = useCallback(async (forceRefresh = false) => {
    if (!personId) return;

    setIsLoading(true);
    setError(null);

    // Capture what was seen BEFORE this load (for "Already seen" badge)
    const seenBeforeLoad = new Set(getSeenPhotoIds());
    setPreviouslySeenPhotoIds(seenBeforeLoad);

    if (!forceRefresh) {
      const cached = getCachedPersonPhotos<Photo[]>(personId);
      if (cached) {
        const photoUrlMap = getPhotoUrlMap();
        const hydratedPhotos = cached.map((photo) => ({
          ...photo,
          photoURL: photoUrlMap[photo.photoId] || photo.photoURL,
        }));
        setPhotos(hydratedPhotos);
        setHasLoaded(true);
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await fetchPersonPhotos(personId);

      // Process photos with cached URLs
      const photoUrlMap = getPhotoUrlMap();
      const processedPhotos = response.photos.map((photo) => {
        // Use cached URL if available, otherwise use new one and cache it
        if (photoUrlMap[photo.photoId]) {
          return { ...photo, photoURL: photoUrlMap[photo.photoId] };
        }
        updatePhotoUrlMap(photo.photoId, photo.photoURL);
        return photo;
      });

      setPhotos(processedPhotos);
      setCachedPersonPhotos(personId, processedPhotos);

      // Mark these photos as seen for future visits to other persons
      const newPhotoIds = processedPhotos.map((p) => p.photoId);
      addSeenPhotoIds(newPhotoIds);

      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setIsLoading(false);
    }
  }, [personId]);

  const handleForceRefresh = useCallback(() => {
    handleLoadImages(true);
  }, [handleLoadImages]);

  const handleClearGlobalPhotoCache = useCallback(() => {
    clearGlobalPhotoCache();
    setPreviouslySeenPhotoIds(new Set());
  }, []);

  const handlePhotoClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleLightboxOpenChange = useCallback((open: boolean) => {
    setLightboxOpen(open);
  }, []);

  const handleNavigate = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const backButton = useMemo(() => (
    <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  ), [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        backButton={backButton}
        personId={personId}
        showPersonControls
        onLoadImages={() => handleLoadImages(false)}
        onForceRefresh={handleForceRefresh}
        onClearGlobalPhotoCache={handleClearGlobalPhotoCache}
        isLoading={isLoading}
      />

      <main className="flex-1 container py-6 space-y-6">
        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => handleLoadImages(true)}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <PhotoTileSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State - Not Yet Loaded */}
        {!isLoading && !hasLoaded && !error && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <Images className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>View Photos</CardTitle>
              <CardDescription>
                Click "Load Images" to fetch photos for this person.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => handleLoadImages(false)}>
                Load Images
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State - No Photos */}
        {!isLoading && hasLoaded && photos.length === 0 && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>No photos found</CardTitle>
              <CardDescription>
                This person has no associated photos.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Photo Grid (Masonry) */}
        {!isLoading && photos.length > 0 && (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
            {photos.map((photo, index) => (
              <PhotoTile
                key={photo.photoId}
                photo={photo}
                isSeen={previouslySeenPhotoIds.has(photo.photoId)}
                onClick={() => handlePhotoClick(index)}
              />
            ))}
          </div>
        )}

        {/* Lightbox */}
        <PhotoLightbox
          photos={photos}
          currentIndex={lightboxIndex}
          open={lightboxOpen}
          onOpenChange={handleLightboxOpenChange}
          onNavigate={handleNavigate}
        />
      </main>
    </div>
  );
}

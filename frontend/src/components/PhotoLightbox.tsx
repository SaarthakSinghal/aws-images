import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff } from "lucide-react";
import type { Photo } from "@/types/api";
import { useState, useEffect, useCallback, memo } from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface PhotoLightboxProps {
  photos: Photo[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}

export const PhotoLightbox = memo(function PhotoLightbox({
  photos,
  currentIndex,
  open,
  onOpenChange,
  onNavigate,
}: PhotoLightboxProps) {
  const [imageError, setImageError] = useState(false);

  // Reset image error when navigating to a different photo
  useEffect(() => {
    setImageError(false);
  }, [currentIndex]);

  const currentPhoto = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(currentIndex - 1);
    }
  }, [hasPrev, onNavigate, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(currentIndex + 1);
    }
  }, [hasNext, onNavigate, currentIndex]);

  const handleOpenInNewTab = useCallback(() => {
    if (currentPhoto) {
      window.open(currentPhoto.photoURL, "_blank", "noopener,noreferrer");
    }
  }, [currentPhoto]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
  }, [handlePrev, handleNext]);

  if (!currentPhoto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-full h-[90vh] p-0 gap-0"
        onKeyDown={handleKeyDown}
      >
        <VisuallyHidden>
          <DialogTitle>Photo {currentIndex + 1} of {photos.length}</DialogTitle>
        </VisuallyHidden>
        
        <div className="relative flex-1 flex items-center justify-center bg-background/50 min-h-0">
          {imageError ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
              <ImageOff className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                URL expired — force refresh to get new presigned URLs
              </p>
            </div>
          ) : (
            <img
              src={currentPhoto.photoURL}
              alt={`Photo ${currentPhoto.photoId}`}
              className="max-w-full max-h-[calc(90vh-4rem)] object-contain"
              onError={() => setImageError(true)}
            />
          )}

          {hasPrev && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {hasNext && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <span className="text-sm text-muted-foreground font-mono">
            {currentIndex + 1} / {photos.length}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInNewTab}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

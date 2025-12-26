import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff, Eye } from "lucide-react";
import type { Photo } from "@/types/api";
import { useState, memo, useCallback } from "react";

interface PhotoTileProps {
  photo: Photo;
  isSeen: boolean;
  onClick: () => void;
}

export const PhotoTile = memo(function PhotoTile({ photo, isSeen, onClick }: PhotoTileProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const displayUrl = photo.thumbURL || photo.photoURL;

  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <Card
      className="group cursor-pointer overflow-hidden break-inside-avoid mb-4 transition-all duration-200 hover:border-ring hover:shadow-lg"
      onClick={handleClick}
    >
      <div className="relative">
        {imageLoading && (
          <Skeleton className="absolute inset-0 w-full h-48" />
        )}
        {imageError ? (
          <div className="w-full h-48 bg-muted flex flex-col items-center justify-center gap-2 p-4">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center">
              URL expired — force refresh
            </span>
          </div>
        ) : (
          <img
            src={displayUrl}
            alt={`Photo ${photo.photoId}`}
            className={`w-full h-auto object-contain transition-opacity duration-200 ${
              imageLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        )}
        
        {isSeen && (
          <Badge 
            className="absolute top-2 right-2 text-xs px-2 py-0.5 flex items-center gap-1"
            variant="secondary"
          >
            <Eye className="h-3 w-3" />
            Already seen
          </Badge>
        )}
        
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors duration-200" />
      </div>
    </Card>
  );
});

export function PhotoTileSkeleton() {
  return (
    <Card className="overflow-hidden break-inside-avoid mb-4">
      <Skeleton className="w-full h-48" />
    </Card>
  );
}

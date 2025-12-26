import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, ImageOff } from "lucide-react";
import type { Person } from "@/types/api";
import { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";

interface PersonCardProps {
  person: Person;
}

export const PersonCard = memo(function PersonCard({ person }: PersonCardProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const navigate = useNavigate();

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(person.personId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [person.personId]);

  const handleClick = useCallback(() => {
    navigate(`/person/${person.personId}`);
  }, [navigate, person.personId]);

  const truncateId = useCallback((id: string) => {
    if (id.length <= 10) return id;
    return `${id.substring(0, 5)}...${id.substring(id.length - 3)}`;
  }, []);

  return (
    <Card
      className="group cursor-pointer transition-all duration-200 hover:border-ring hover:shadow-lg"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {imageLoading && (
              <Skeleton className="absolute inset-0 w-20 h-20 rounded-full" />
            )}
            {imageError ? (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border">
                <ImageOff className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={person.repThumbURL}
                alt={`Person ${person.personId}`}
                className={`w-20 h-20 rounded-full object-cover border-2 border-border shadow-md transition-all duration-200 group-hover:border-ring ${
                  imageLoading ? "opacity-0" : "opacity-100"
                }`}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            )}
            <Badge className="absolute -bottom-1 -right-1 text-xs px-1.5" variant="secondary">
              {person.photoCount}
            </Badge>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                {truncateId(person.personId)}
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs">{person.personId}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
});

export function PersonCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

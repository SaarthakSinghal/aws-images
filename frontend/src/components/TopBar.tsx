import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Check, Users } from "lucide-react";
import { getDisplayApiUrl, getFullApiUrl } from "@/lib/api";
import { useState, useCallback, useEffect, memo } from "react";

interface TopBarProps {
  onLoadPeople?: () => void;
  onForceRefresh?: () => void;
  onClearCache?: () => void;
  isLoading?: boolean;
  showPeopleControls?: boolean;
  backButton?: React.ReactNode;
  personId?: string;
  onLoadImages?: () => void;
  onClearGlobalPhotoCache?: () => void;
  showPersonControls?: boolean;
}

export const TopBar = memo(function TopBar({
  onLoadPeople,
  onForceRefresh,
  onClearCache,
  isLoading = false,
  showPeopleControls = false,
  backButton,
  personId,
  onLoadImages,
  onClearGlobalPhotoCache,
  showPersonControls = false,
}: TopBarProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPersonId, setCopiedPersonId] = useState(false);

  // Reset copy states when personId changes
  useEffect(() => {
    setCopiedPersonId(false);
  }, [personId]);

  const handleCopyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(getFullApiUrl());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }, []);

  const handleCopyPersonId = useCallback(async () => {
    if (personId) {
      await navigator.clipboard.writeText(personId);
      setCopiedPersonId(true);
      setTimeout(() => setCopiedPersonId(false), 2000);
    }
  }, [personId]);

  const truncatePersonId = useCallback((id: string) => {
    if (id.length <= 12) return id;
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4">
        {backButton}
        
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">People Clustering</h1>
        </div>

        {personId && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopyPersonId}
                  className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  {truncatePersonId(personId)}
                  {copiedPersonId ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{personId}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {getDisplayApiUrl()}
              {copiedUrl ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">Click to copy API URL</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {showPeopleControls && (
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={onLoadPeople}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load People"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onForceRefresh}
              disabled={isLoading}
            >
              Force Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearCache}
            >
              Clear Cache
            </Button>
          </div>
        )}

        {showPersonControls && (
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={onLoadImages}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load Images"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onForceRefresh}
              disabled={isLoading}
            >
              Force Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearGlobalPhotoCache}
            >
              Clear Global Photo Cache
            </Button>
          </div>
        )}
      </div>
    </header>
  );
});

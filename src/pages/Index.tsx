import { useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/TopBar";
import { PersonCard, PersonCardSkeleton } from "@/components/PersonCard";
import { ConfigScreen } from "@/components/ConfigScreen";
import { hasApiConfig, fetchPersons } from "@/lib/api";
import { getCachedPersons, setCachedPersons, clearAllCache } from "@/lib/cache";
import { AlertCircle, Search, Users } from "lucide-react";
import type { Person } from "@/types/api";

type SortOrder = "desc" | "asc";

export default function PeoplePage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [hasLoaded, setHasLoaded] = useState(false);

  // Hydrate from cache on mount (no network call)
  useEffect(() => {
    const cached = getCachedPersons<Person[]>();
    if (cached) {
      setPersons(cached);
      setHasLoaded(true);
    }
  }, []);

  const handleLoadPeople = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    if (!forceRefresh) {
      const cached = getCachedPersons<Person[]>();
      if (cached) {
        setPersons(cached);
        setHasLoaded(true);
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await fetchPersons();
      setPersons(response.persons);
      setCachedPersons(response.persons);
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load people");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleForceRefresh = useCallback(() => {
    handleLoadPeople(true);
  }, [handleLoadPeople]);

  const handleClearCache = useCallback(() => {
    clearAllCache();
    setPersons([]);
    setHasLoaded(false);
  }, []);

  const filteredAndSortedPersons = useMemo(() => {
    let result = [...persons];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.personId.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      if (sortOrder === "desc") {
        return b.photoCount - a.photoCount;
      }
      return a.photoCount - b.photoCount;
    });

    return result;
  }, [persons, searchQuery, sortOrder]);

  if (!hasApiConfig()) {
    return <ConfigScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        showPeopleControls
        onLoadPeople={() => handleLoadPeople(false)}
        onForceRefresh={handleForceRefresh}
        onClearCache={handleClearCache}
        isLoading={isLoading}
      />

      <main className="flex-1 container py-6 space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by person ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Photo count (high to low)</SelectItem>
              <SelectItem value="asc">Photo count (low to high)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => handleLoadPeople(true)}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <PersonCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State - Not Yet Loaded */}
        {!isLoading && !hasLoaded && !error && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Welcome to People Clustering</CardTitle>
              <CardDescription>
                Click "Load People" to fetch and display clustered faces from your photo collection.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => handleLoadPeople(false)}>
                Load People
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State - No Results */}
        {!isLoading && hasLoaded && filteredAndSortedPersons.length === 0 && (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>No people found</CardTitle>
              <CardDescription>
                {searchQuery
                  ? "Try adjusting your search query."
                  : "No clustered faces are available. Try uploading some photos."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* People Grid */}
        {!isLoading && filteredAndSortedPersons.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAndSortedPersons.map((person) => (
              <PersonCard key={person.personId} person={person} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

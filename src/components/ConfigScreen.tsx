import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileCode } from "lucide-react";
import { memo } from "react";

export const ConfigScreen = memo(function ConfigScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Configuration Required
          </CardTitle>
          <CardDescription>
            The API base URL is not configured. Please set up your environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Missing Configuration</AlertTitle>
            <AlertDescription>
              <code className="font-mono text-sm">VITE_API_BASE_URL</code> is not set.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Create a <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">.env</code> file in your project root:
            </p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code className="font-mono text-sm">VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod</code>
            </pre>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Then restart the development server:</p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code className="font-mono text-sm">npm run dev</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

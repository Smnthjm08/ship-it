import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Github } from "lucide-react";
import Link from "next/link";
import { GitHubInstallation } from "@/types/types";

export default function GitHubSection({
  installations,
}: {
  installations: GitHubInstallation[];
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Github className="w-5 h-5" />
        GitHub Connections
      </h2>

      {installations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {installations.map((installation) => (
            <Card
              key={installation.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Github className="w-5 h-5" />
                  {installation.accountLogin}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Connected:</span>
                  <span className="text-xs">
                    {new Date(installation.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {installation.accessToken && (
                  <Badge variant="default" className="mt-2">
                    <span className="mr-1">●</span> Connected
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty className="border rounded-lg">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Github className="w-12 h-12 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>Connect Your GitHub Account</EmptyTitle>
            <EmptyDescription>
              Connect your GitHub account to start deploying projects directly
              from your repositories.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/connect-github">
                <Github className="w-4 h-4 mr-2" />
                Connect GitHub
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}

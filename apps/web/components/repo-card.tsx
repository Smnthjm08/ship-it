import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Lock, Globe, Code2 } from "lucide-react";
import Link from "next/link";

interface RepoCardProps {
  repo: {
    id: number;
    name: string;
    fullName: string;
    private: boolean;
    visibility: string;
    owner: string;
    description: string;
    updatedAt: string;
    size: number;
    defaultBranch: string;
    language: string;
    topics: string[];
    techStack: string[];
    url: string;
  };
}

export default function RepoCard({ repo }: RepoCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Updated today";
    if (diffInDays === 1) return "Updated yesterday";
    if (diffInDays < 7) return `Updated ${diffInDays} days ago`;
    if (diffInDays < 30)
      return `Updated ${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365)
      return `Updated ${Math.floor(diffInDays / 30)} months ago`;
    return `Updated ${Math.floor(diffInDays / 365)} years ago`;
  };

  return (
    <Card className="w-full hover:shadow-lg transition-all duration-200 hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {repo.private ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Globe className="h-4 w-4 text-muted-foreground" />
              )}
              {repo.name}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {repo.fullName}
            </CardDescription>
          </div>
          <Badge
            variant={repo.private ? "secondary" : "outline"}
            className="ml-2"
          >
            {repo.visibility}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {repo.description || "No description provided"}
        </p>

        {repo.techStack && repo.techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {repo.techStack.map((tech, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Code2 className="h-3 w-3 mr-1" />
                {tech}
              </Badge>
            ))}
          </div>
        )}

        {repo.topics && repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {repo.topics.slice(0, 5).map((topic, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {topic}
              </Badge>
            ))}
            {repo.topics.length > 5 && (
              <Badge variant="outline" className="text-xs text-green-600">
                +{repo.topics.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          {formatDate(repo.updatedAt)}
        </div>
        <Link
          href={`/new/import/?repo=${repo?.fullName}&owner=${repo?.owner}&branch=${repo?.defaultBranch}&url=${repo?.url}`}
        >
          <Button size="sm" variant="default">
            Import
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

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
import { GitBranch, Github, Calendar } from "lucide-react";
import Link from "next/link";

export interface ProjectTypes {
  id: string;
  name: string;
  repoUrl: string;
  owner: string;
  repoName: string;
  branch: string;
  framework?: string | null;
  createdAt: Date;
  deployments?: { id: string; status?: string }[];
}

interface ProjectsCardProps {
  project: ProjectTypes;
}

export default function ProjectsCard({ project }: ProjectsCardProps) {
  const latestDeployment = project.deployments?.[0];

  return (
    <Card className="w-full max-w-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{project.name}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Github className="h-3 w-3" />
              {project.owner}/{project.repoName}
            </CardDescription>
          </div>
          {project.framework && (
            <Badge variant="secondary">{project.framework}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="h-4 w-4" />
          <span>{project.branch}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Created {new Date(project.createdAt).toLocaleDateString()}
          </span>
        </div>

        {latestDeployment && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Latest:</span>
            <Badge
              variant={
                latestDeployment.status === "success"
                  ? "default"
                  : "destructive"
              }
            >
              {latestDeployment.status || "pending"}
            </Badge>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button asChild className="flex-1">
          <Link href={`/projects/${project.id}`}>View Project</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={project.repoUrl} target="_blank">
            <Github className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

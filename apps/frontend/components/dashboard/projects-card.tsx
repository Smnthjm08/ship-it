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
import {
  Github,
  GitBranch,
  Folder,
  Calendar,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Project } from "@/types/types";
import Link from "next/link";
import { ScrollArea } from "../ui/scroll-area";

export default function ProjectsSection({
  projects,
  hasGitHubConnection,
}: {
  projects: Project[];
  hasGitHubConnection: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Folder className="w-5 h-5" />
          Projects ({projects.length})
        </h2>
        {projects.length > 0 && hasGitHubConnection && (
          <Button asChild>
            <Link href="/new">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Link>
          </Button>
        )}
      </div>

      {projects.length > 0 ? (
        <ScrollArea className="h-[calc(100vh-280px)] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Empty className="border rounded-lg min-h-[450px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Folder className="w-12 h-12 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>
              {hasGitHubConnection
                ? "No Projects Yet"
                : "Connect GitHub to Get Started"}
            </EmptyTitle>
            <EmptyDescription>
              {hasGitHubConnection
                ? "Create your first project to start deploying your applications."
                : "You need to connect your GitHub account before you can create projects."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {hasGitHubConnection ? (
              <Button asChild disabled>
                <Link href="/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Link>
              </Button>
            ) : (
              <Button asChild variant="default">
                <Link href="/connect-github">
                  <Github className="w-4 h-4 mr-2" />
                  Connect GitHub
                </Link>
              </Button>
            )}
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          {project.framework && (
            <Badge variant="outline" className="ml-2">
              {project.framework}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Github className="w-4 h-4 text-gray-500" />
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:underline flex items-center gap-1 truncate"
            >
              {project.owner}/{project.repoName}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <GitBranch className="w-4 h-4" />
            <span>{project.branch}</span>
          </div>
        </div>

        {(project.buildCommand || project.outputDir) && (
          <div className="pt-3 border-t space-y-2">
            {project.buildCommand && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Build:</span>{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                  {project.buildCommand}
                </code>
              </div>
            )}
            {project.outputDir && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Output:</span>{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                  {project.outputDir}
                </code>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
          <Calendar className="w-3 h-3" />
          Created {new Date(project.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

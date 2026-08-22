"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientAxios } from "@/lib/axios-instance";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteProjectSectionProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectSection({
  projectId,
  projectName,
}: DeleteProjectSectionProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const canDelete = confirmation.trim() === projectName;

  const handleDeleteProject = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await clientAxios.delete(`/projects/${projectId}`);
      toast.success(`Deleted ${projectName}`);
      router.push("/projects");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete project", error);
      toast.error("Failed to delete project. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Delete project</CardTitle>
        <CardDescription>
          Removes {projectName} and its deployment history. The deployed site
          stops resolving. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>

      {/* Flat: the action sits in the card footer rather than inside a second
          bordered panel nested in the card body. */}
      <CardContent className="sr-only" />

      <CardFooter className="border-destructive/20 bg-destructive/5 border-t px-6 py-4">
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setConfirmation("");
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 aria-hidden />
              Delete project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {projectName}?</DialogTitle>
              <DialogDescription>
                This removes the project, its deployments and its environment
                variables. The live URL will stop working immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="confirm-project-name">
                Type <span className="font-machine">{projectName}</span> to
                confirm
              </Label>
              <Input
                id="confirm-project-name"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-machine text-sm"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProject}
                disabled={isDeleting || !canDelete}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 aria-hidden />
                    Delete project
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

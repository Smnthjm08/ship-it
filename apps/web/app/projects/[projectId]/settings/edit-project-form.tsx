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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientAxios } from "@/lib/axios-instance";
import { toast } from "sonner";

interface EditProjectFormProps {
  projectId: string;
  initialName: string;
  initialDescription: string | null;
}

export function EditProjectForm({
  projectId,
  initialName,
  initialDescription,
}: EditProjectFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await clientAxios.patch(`/projects/${projectId}`, {
        name: projectName,
        description,
      });
      toast.success("Project updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Failed to update project", error);
      toast.error("Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure your project&apos;s general information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Awesome Project"
              required
            />
            <p className="text-sm text-muted-foreground">
              This is your project&apos;s visible name within ShipIt.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your project..."
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Describe what your project does (optional).
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

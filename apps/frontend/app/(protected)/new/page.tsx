import { Suspense } from "react";
import NewProjectForm from "@/components/new-project-form";

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewProjectForm />
    </Suspense>
  );
}

"use client";

import CreateNewProjectForm from "@/components/create-project-form";
import { Suspense } from "react";

export default function ImportPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <CreateNewProjectForm />
      </Suspense>
    </main>
  );
}

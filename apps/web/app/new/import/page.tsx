"use client";

import CreateNewProjectForm from "@/components/create-project-form";
import { Suspense } from "react";

export default function ImportPage() {
  console.log("PUBLIC API:", process.env.NEXT_PUBLIC_API_BASE_URL);

  return (
    <Suspense fallback={null}>
      <CreateNewProjectForm />
    </Suspense>
  );
}

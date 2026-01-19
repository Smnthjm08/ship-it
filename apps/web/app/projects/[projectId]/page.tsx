"use client";

import { useParams } from "next/navigation";

export default function ProjectPage() {
  const { projectId } = useParams();

  return (
    <main>
      <div>Project Page {projectId}</div>
    </main>
  );
}

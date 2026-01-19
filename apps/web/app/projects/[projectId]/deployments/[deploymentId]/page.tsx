"use client";

import { useParams } from "next/navigation";

export default function DeploymentPage() {
  const { projectId, deploymentId } = useParams();

  return (
    <main>
      <div>Deployment Page</div>
      <div>Project Id: {projectId}</div>
      <div>Deployment Id: {deploymentId}</div>
    </main>
  );
}

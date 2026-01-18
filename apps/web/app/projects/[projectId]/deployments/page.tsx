"use client";

import { useParams } from "next/navigation";

export default function DeployementsPage() {
    const { projectId } = useParams();
    return (
        <main>
            <div>Deployements Page {projectId}</div>
        </main>
    )
}
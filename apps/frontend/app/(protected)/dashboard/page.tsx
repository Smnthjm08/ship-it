import ProjectCard from "@/components/dashboard/project-card";

export default function DashboardPage() {
  return (
    <main className="p-24 bg-red-500 flex">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <ProjectCard />
    </main>
  );
}

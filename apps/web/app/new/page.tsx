import RepoCard from "@/components/repo-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getServerAxios } from "@/lib/axios-instance";

export default async function NewProjectPage() {

  const axiosInstance = await getServerAxios();
  const projects = await axiosInstance.get("/new");
  console.log("projects", projects);
  const data: [] = projects?.data?.data;

  return (
    <main className="flex flex-col justify-between py-6 px-12 gap-4 lg:px-24">
      <h1 className="text-2xl font-bold">Let&apos;s build something new</h1>

      <div className="flex gap-2">
        <Input placeholder="Enter a Git repository URL here..." />
        <Button>Continue</Button>
      </div>

      <h2 className="text-xl font-bold">Import from Git Repository</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {Array.isArray(data) &&
          data.map((project: any) => (
            <RepoCard key={project.id} repo={project} />
          ))}
      </div>
    </main>
  );
}

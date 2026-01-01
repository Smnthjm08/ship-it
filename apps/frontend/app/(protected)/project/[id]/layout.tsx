import ProjectNavBar from "@/components/project-navbar";

export default function ProtectedProjectLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <ProjectNavBar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

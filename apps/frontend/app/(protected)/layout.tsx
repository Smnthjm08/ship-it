import { Appbar } from "@/components/appbar";
import { TooltipProvider } from "@/components/ui/tooltip";
// import ProjectNavBar from "@/components/project-navbar";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <TooltipProvider>
        <Appbar />
        {/* <ProjectNavBar /> */}
        <main className="flex-1">{children}</main>
      </TooltipProvider>
    </div>
  );
}

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@repo/auth/server";
import LandingPage from "@/components/landing-page";

// Marketing page only. It used to render the project grid for signed-in users
// too — one URL doing two jobs, neither able to own its metadata.
export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user?.id) {
    redirect("/projects");
  }

  return <LandingPage />;
}

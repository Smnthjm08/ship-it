import { cookies } from "next/headers";

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const cookieStore = await cookies();

  const res = await fetch(`${baseUrl}/api/project/${params.id}`, {
    cache: "no-store",
    headers: {
      Cookie: cookieStore.toString(),
    },
  });

  const data = await res.json();

  return (
    <div>
      <div>ProjectPage {params.id}</div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

import axios from "axios";

if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
  );
}

// Use this for Client Components
export const clientAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

// Use this for Server Components
export const getServerAxios = async () => {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const cookie = headersList.get("cookie");

  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    headers: {
      Cookie: cookie || "",
    },
    withCredentials: true,
  });
};

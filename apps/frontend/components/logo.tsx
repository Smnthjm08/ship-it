import { title } from "@/constants/constants";
import { Rocket } from "lucide-react";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/">
      <div className="flex items-center gap-1 text-blue-300 font-semibold">
        <Rocket className="h-4 w-4" />
        {title}
      </div>
    </Link>
  );
}

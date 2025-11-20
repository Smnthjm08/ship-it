"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut, useSession } from "@workspace/shared/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, LogsIcon } from "lucide-react";
import Link from "next/link";

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.split(" ");
  return parts
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function Appbar() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully.");
    router.push("/");
  };

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b-2 border-dashed border-gray-600 h-16">
      <Link href="/dashboard">
        <div className="flex gap-2 items-center">
          <LogsIcon width={20} height={20} />
          <h1 className="text-xl font-semibold tracking-tight">ShipIt</h1>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={session?.user?.image ?? ""}
                alt={session?.user?.name ?? "User"}
              />
              <AvatarFallback>
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-48" align="end">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground">
              {session?.user?.email}
            </p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => router.push("/profile")}
            className="cursor-pointer"
          >
            Profile
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-red-500 font-semibold"
          >
            <LogOut className="mr-2 h-4 w-4 text-red-500" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LogOut, LogInIcon as LogsIcon } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "./mode-toggle";

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.split(" ");
  return parts
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function Appbar() {
  const userInitials = getInitials("John Doe");

  return (
    <header className="flex sticky items-center justify-between px-8 py-4 border-b border-border h-16">
      <Link href="/dashboard">
        <div className="flex gap-2 items-center">
          <LogsIcon width={20} height={20} />
          <h1 className="text-xl font-semibold tracking-tight">ShipIt</h1>
        </div>
      </Link>

      <div className="flex items-center gap-x-4">
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-48" align="end">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">John Doe</p>
              <p className="text-xs text-muted-foreground">john@example.com</p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer">
              Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-500 font-semibold">
              <LogOut className="mr-2 h-4 w-4 text-red-500" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

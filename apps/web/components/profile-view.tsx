"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { Github } from "lucide-react";
import { absoluteTime } from "@/lib/format";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Read-only: name and email come from GitHub, so this links out rather than
// pretending to own them. The old edit mode's Save only called console.log.
export function ProfileView() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8 md:py-10">
      <div className="mb-8">
        <h1 className="text-display-sm">Account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your ShipIt account, connected through GitHub.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarImage src={user.image || undefined} alt="" />
              <AvatarFallback className="text-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="truncate text-lg">{user.name}</CardTitle>
              <CardDescription className="truncate">
                {user.email}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <dl className="divide-border divide-y text-sm">
            <div className="flex items-center justify-between py-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="flex items-center gap-2">
                <span className="truncate">{user.email}</span>
                {user.emailVerified && (
                  <Badge variant="success">Verified</Badge>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="font-machine text-xs">
                {absoluteTime(user.createdAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Profile details</dt>
              <dd>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://github.com/settings/profile"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github aria-hidden />
                    Edit on GitHub
                  </a>
                </Button>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}

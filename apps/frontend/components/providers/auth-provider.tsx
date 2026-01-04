"use client";

import { createContext } from "react";

import type { Session, User } from "better-auth";

export interface AuthContextType {
  session: Session;
  user: User;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  session,
  children,
}: {
  session: AuthContextType;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}

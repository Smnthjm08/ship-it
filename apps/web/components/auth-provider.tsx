"use client";

import { createContext, useContext, ReactNode } from "react";
import type { SessionUser } from "@/types/session";

interface AuthContextType {
  user: SessionUser | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  user: SessionUser | null;
}

export function AuthProvider({ children, user }: AuthProviderProps) {
  const value = {
    user,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

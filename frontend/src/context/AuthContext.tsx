import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types/index.ts";
import { authApi } from "../services/api.ts";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithDemo: () => Promise<void>;
  loginWithGoogle: (googlePayload?: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("reachinbox_token"));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const storedToken = localStorage.getItem("reachinbox_token");
        if (storedToken) {
          const res = await authApi.getMe();
          if (res.data.user) {
            setUser(res.data.user);
          }
        } else {
          // Auto login demo reviewer if no session
          await loginWithDemo();
        }
      } catch (err) {
        console.warn("Auth check failed, initializing demo user");
        await loginWithDemo();
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const loginWithDemo = async () => {
    try {
      const res = await authApi.login({
        email: "demo.reviewer@reachinbox.ai",
        name: "Demo Reviewer",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      });
      if (res.data.token) {
        localStorage.setItem("reachinbox_token", res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) {
      console.error("Demo login error:", err);
    }
  };

  const loginWithGoogle = async (googlePayload?: any) => {
    try {
      const res = await authApi.login({
        email: googlePayload?.email || "google.user@reachinbox.ai",
        name: googlePayload?.name || "Google User",
        avatar: googlePayload?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        googleId: googlePayload?.sub || "google-oauth-demo-id",
      });
      if (res.data.token) {
        localStorage.setItem("reachinbox_token", res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  const logout = () => {
    localStorage.removeItem("reachinbox_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithDemo, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

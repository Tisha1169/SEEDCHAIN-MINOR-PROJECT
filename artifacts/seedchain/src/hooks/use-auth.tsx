import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "farmer" | "storage" | "logistics" | "buyer" | "admin";
  location?: string;
  phone?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem("seedchain_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("seedchain_user");
      }
    }
    setLoading(false);

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        localStorage.removeItem("seedchain_user");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    // Try Supabase auth first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!authError && authData.user) {
      // Fetch user profile from users table
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profile) {
        const appUser: AppUser = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          location: profile.location,
          phone: profile.phone,
        };
        setUser(appUser);
        localStorage.setItem("seedchain_user", JSON.stringify(appUser));
        setLocation(`/${appUser.role}`);
        return;
      }
    }

    // Fallback: demo mode (works without Supabase configured)
    const demoUsers: Record<string, AppUser> = {
      "admin@seedchain.io": { id: "demo-1", name: "Admin User", email: "admin@seedchain.io", role: "admin", location: "Mumbai" },
      "rajesh@farmer.com": { id: "demo-2", name: "Rajesh Kumar", email: "rajesh@farmer.com", role: "farmer", location: "Punjab" },
      "storage@coolstore.com": { id: "demo-3", name: "Cool Storage", email: "storage@coolstore.com", role: "storage", location: "Delhi" },
      "buyer@greenmart.com": { id: "demo-4", name: "Green Mart", email: "buyer@greenmart.com", role: "buyer", location: "Bangalore" },
      "logistics@fasttrack.com": { id: "demo-5", name: "FastTrack", email: "logistics@fasttrack.com", role: "logistics", location: "Chennai" },
    };

    const demoUser = demoUsers[email];
    if (demoUser) {
      setUser(demoUser);
      localStorage.setItem("seedchain_user", JSON.stringify(demoUser));
      setLocation(`/${demoUser.role}`);
      return;
    }

    throw new Error("Invalid email or password");
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      // Fallback demo mode
      const appUser: AppUser = {
        id: `demo-${Date.now()}`,
        name,
        email,
        role: role as AppUser["role"],
      };
      setUser(appUser);
      localStorage.setItem("seedchain_user", JSON.stringify(appUser));
      setLocation(`/${appUser.role}/setup`);
      return;
    }

    if (authData.user) {
      // Create profile in users table
      await supabase.from("users").insert({
        id: authData.user.id,
        name,
        email,
        role,
      });

      const appUser: AppUser = {
        id: authData.user.id,
        name,
        email,
        role: role as AppUser["role"],
      };
      setUser(appUser);
      localStorage.setItem("seedchain_user", JSON.stringify(appUser));
      setLocation(`/${appUser.role}/setup`);
    }
  };

  const logout = () => {
    supabase.auth.signOut();
    localStorage.removeItem("seedchain_user");
    setUser(null);
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

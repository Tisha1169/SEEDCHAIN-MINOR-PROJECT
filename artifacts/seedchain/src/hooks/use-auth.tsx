import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

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
    const token = localStorage.getItem("token");
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("seedchain_user");
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Demo accounts for fallback
    const demoUsers: Record<string, AppUser> = {
      "admin@seedchain.io": { id: "demo-1", name: "Admin User", email: "admin@seedchain.io", role: "admin", location: "Mumbai" },
      "rajesh@farmer.com": { id: "demo-2", name: "Rajesh Kumar", email: "rajesh@farmer.com", role: "farmer", location: "Punjab" },
      "storage@coolstore.com": { id: "demo-3", name: "Cool Storage", email: "storage@coolstore.com", role: "storage", location: "Delhi" },
      "buyer@greenmart.com": { id: "demo-4", name: "Green Mart", email: "buyer@greenmart.com", role: "buyer", location: "Bangalore" },
      "logistics@fasttrack.com": { id: "demo-5", name: "FastTrack", email: "logistics@fasttrack.com", role: "logistics", location: "Chennai" },
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const appUser: AppUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          location: data.user.location,
          phone: data.user.phone,
        };

        localStorage.setItem("token", data.token);
        localStorage.setItem("seedchain_user", JSON.stringify(appUser));
        setUser(appUser);
        setLocation(`/${appUser.role}`);
        return;
      }
    } catch (err) {
      // Fall through to demo mode
    }

    // Fallback: demo mode (works without backend)
    const demoUser = demoUsers[email];
    if (demoUser) {
      localStorage.setItem("seedchain_user", JSON.stringify(demoUser));
      setUser(demoUser);
      setLocation(`/${demoUser.role}`);
      return;
    }

    throw new Error("Invalid email or password");
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const appUser: AppUser = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          location: data.user.location,
          phone: data.user.phone,
        };

        localStorage.setItem("token", data.token);
        localStorage.setItem("seedchain_user", JSON.stringify(appUser));
        setUser(appUser);
        setLocation(`/${appUser.role}/setup`);
        return;
      }
    } catch (err) {
      // Fall through to demo mode
    }

    // Fallback: demo mode registration (works without backend)
    const appUser: AppUser = {
      id: `demo-${Date.now()}`,
      name,
      email,
      role: role as AppUser["role"],
    };
    localStorage.setItem("seedchain_user", JSON.stringify(appUser));
    setUser(appUser);
    setLocation(`/${appUser.role}/setup`);
  };

  const logout = () => {
    localStorage.removeItem("seedchain_user");
    localStorage.removeItem("token");
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

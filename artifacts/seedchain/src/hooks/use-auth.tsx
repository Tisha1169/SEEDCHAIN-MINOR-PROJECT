import i18n from "@/i18n";
import { createContext, useContext, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey, useGetCurrentUser, useLoginUser, useLogoutUser, useRegisterUser, type CurrentUser, type RegisterUserBody } from "@workspace/api-client-react";
import { ApiError } from "@workspace/api-client-react";

interface AuthContextType {
  user: CurrentUser | null;
  loading: boolean;
  /** Set when the API itself is unreachable (distinct from "not signed in"). */
  serviceError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (body: RegisterUserBody) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const homeFor = (role: CurrentUser["role"]) => `/${role}`;

/**
 * Identity comes only from the server session (httpOnly cookie).
 * Nothing about the user or their role is stored in the browser.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const me = useGetCurrentUser({ query: { retry: false, staleTime: 60_000, queryKey: getGetCurrentUserQueryKey() } });
  const loginM = useLoginUser();
  const registerM = useRegisterUser();
  const logoutM = useLogoutUser();

  const unauthenticated = me.error instanceof ApiError && me.error.status === 401;
  const serviceError = me.error && !unauthenticated ? i18n.t("auth.serviceDown") : null;
  const user = me.data ?? null;

  const value: AuthContextType = {
    user,
    loading: me.isLoading,
    serviceError,
    isAuthenticated: !!user,
    async login(email, password) {
      const r = await loginM.mutateAsync({ data: { email, password } });
      qc.setQueryData(getGetCurrentUserQueryKey(), r.user);
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "/api/auth/me" });
      navigate(homeFor(r.user.role));
    },
    async register(body) {
      const r = await registerM.mutateAsync({ data: body });
      qc.setQueryData(getGetCurrentUserQueryKey(), r.user);
      navigate(homeFor(r.user.role));
    },
    async logout() {
      try {
        await logoutM.mutateAsync();
      } finally {
        qc.clear();
        navigate("/");
      }
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

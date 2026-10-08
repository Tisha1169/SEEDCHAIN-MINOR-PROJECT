import type { QueryClient } from "@tanstack/react-query";
import { useGetCartCount } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

/** Number of lots in the signed-in customer's cart (0 for everyone else). */
export function useCartCount(): number {
  const { user } = useAuth();
  const q = useGetCartCount({ query: { queryKey: ["/api/cart/count"], enabled: user?.role === "customer", staleTime: 15_000, refetchInterval: 60_000, retry: false } });
  return user?.role === "customer" ? (q.data?.count ?? 0) : 0;
}

/** Refresh both the cart page and the navbar badge. */
export const refreshCart = (qc: QueryClient) => qc.invalidateQueries({ queryKey: ["/api/cart"] });

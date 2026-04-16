import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";
import { 
  LayoutDashboard, 
  Sprout, 
  Warehouse, 
  Truck, 
  ShoppingBag, 
  Users, 
  LogOut,
  Menu,
  X,
  Package
} from "lucide-react";
import { useState } from "react";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const roleNavItems = {
    farmer: [
      { name: "Overview", href: "/farmer", icon: LayoutDashboard },
      { name: "Seed Batches", href: "/farmer/batches", icon: Sprout },
      { name: "Harvests", href: "/farmer/harvests", icon: Package },
      { name: "Marketplace", href: "/farmer/marketplace", icon: ShoppingBag },
    ],
    storage: [
      { name: "Overview", href: "/storage", icon: LayoutDashboard },
      { name: "Inventory", href: "/storage/inventory", icon: Warehouse },
      { name: "Incoming", href: "/storage/incoming", icon: Truck },
      { name: "Outgoing", href: "/storage/outgoing", icon: Package },
    ],
    logistics: [
      { name: "Overview", href: "/logistics", icon: LayoutDashboard },
      { name: "Deliveries", href: "/logistics/deliveries", icon: Truck },
      { name: "Tracking", href: "/logistics/tracking", icon: LayoutDashboard },
    ],
    buyer: [
      { name: "Overview", href: "/buyer", icon: LayoutDashboard },
      { name: "Marketplace", href: "/buyer/marketplace", icon: ShoppingBag },
      { name: "My Orders", href: "/buyer/orders", icon: Package },
    ],
    admin: [
      { name: "Overview", href: "/admin", icon: LayoutDashboard },
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "All Batches", href: "/admin/batches", icon: Sprout },
      { name: "Storage", href: "/admin/storage", icon: Warehouse },
    ]
  };

  const navItems = roleNavItems[user.role as keyof typeof roleNavItems] || [];

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-full shadow-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6">
            <Link href="/" className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">SeedChain</span>
            </Link>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors
                      ${isActive ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                    `}>
                      <item.icon size={20} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-border">
            <div className="mb-4">
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
            </div>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2" 
              onClick={logout}
            >
              <LogOut size={18} />
              Log out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-64">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  );
}

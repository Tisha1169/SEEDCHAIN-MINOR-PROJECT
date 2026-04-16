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
  Package,
  MapPin,
  Navigation,
  Settings,
  Bell,
  Search,
  BarChart3
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
      { name: "Dashboard", href: "/farmer", icon: LayoutDashboard },
      { name: "Seed Batches", href: "/farmer/batches", icon: Sprout },
      { name: "Harvests", href: "/farmer/harvests", icon: Package },
      { name: "Send to Storage", href: "/farmer/send-to-storage", icon: Warehouse },
      { name: "Marketplace", href: "/farmer/marketplace", icon: ShoppingBag },
      { name: "Shipments", href: "/farmer/shipments", icon: Truck },
    ],
    storage: [
      { name: "Dashboard", href: "/storage", icon: LayoutDashboard },
      { name: "Inventory", href: "/storage/inventory", icon: Warehouse },
      { name: "Incoming", href: "/storage/incoming", icon: Truck },
      { name: "Outgoing", href: "/storage/outgoing", icon: Package },
    ],
    logistics: [
      { name: "Dashboard", href: "/logistics", icon: LayoutDashboard },
      { name: "Deliveries", href: "/logistics/deliveries", icon: Truck },
      { name: "Tracking", href: "/logistics/tracking", icon: Navigation },
      { name: "Update Location", href: "/logistics/update-location", icon: MapPin },
    ],
    buyer: [
      { name: "Dashboard", href: "/buyer", icon: LayoutDashboard },
      { name: "Marketplace", href: "/buyer/marketplace", icon: ShoppingBag },
      { name: "My Orders", href: "/buyer/orders", icon: Package },
    ],
    admin: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "All Batches", href: "/admin/batches", icon: Sprout },
      { name: "Storage", href: "/admin/storage", icon: Warehouse },
      { name: "Analytics", href: "/admin/supply-chain-map", icon: BarChart3 },
    ]
  };

  const navItems = roleNavItems[user.role as keyof typeof roleNavItems] || [];

  return (
    <div className="min-h-screen bg-[#F4F4F8] flex">
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 right-4 z-50 p-2.5 bg-white rounded-xl shadow-lg border border-border/50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Left Sidebar — Matching reference image 2 */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-[72px] bg-white border-r border-border/50 flex flex-col items-center py-6 transform transition-transform duration-200 ease-in-out md:translate-x-0 shadow-sm
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <Link href="/" className="mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3FAF5E] to-[#8FD14F] flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">S</span>
          </div>
        </Link>

        {/* Nav icons */}
        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`
                  w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all group relative
                  ${isActive 
                    ? 'bg-gradient-to-br from-[#3FAF5E] to-[#8FD14F] text-white shadow-lg shadow-[#3FAF5E]/25' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
                `}>
                  <item.icon size={20} />
                  {/* Tooltip */}
                  <div className="absolute left-14 bg-[#1A1A1A] text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {item.name}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col gap-1 mt-auto">
          <button className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <Settings size={20} />
          </button>
          <button 
            onClick={logout}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-[72px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-[#1A1A1A] capitalize">{user.role} Dashboard</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] font-medium capitalize">{user.role}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
              <Search size={16} className="text-muted-foreground" />
              <input type="text" placeholder="Search..." className="bg-transparent outline-none text-sm w-40" />
            </div>
            {/* Notifications */}
            <button className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-all relative">
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#3FAF5E] rounded-full border-2 border-white" />
            </button>
            {/* User avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3FAF5E] to-[#8FD14F] flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">{user.name?.[0]?.toUpperCase() || "U"}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}

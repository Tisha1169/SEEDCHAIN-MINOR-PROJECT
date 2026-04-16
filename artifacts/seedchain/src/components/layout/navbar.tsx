import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Menu, X, Home, Settings, Image, Briefcase } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "About Us", href: "/about", icon: Settings },
  { label: "Gallery", href: "/how-it-works", icon: Image },
  { label: "Services", href: "/marketplace", icon: Briefcase },
];

export function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-5">
      <nav className="max-w-[1200px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" fill="#1A1A1A" />
              <path d="M12 6L8 8.5v5L12 16l4-2.5v-5L12 6z" fill="#E8E6E1" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight text-[#1A1A1A]">SeedChain</span>
        </Link>

        {/* Center — pill nav (matches XFarm ref: rounded capsule buttons) */}
        <div className="hidden md:flex items-center bg-white rounded-full px-1.5 py-1.5 shadow-sm border border-[#E8E6E1]">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-[#F4F4F4] text-[#1A1A1A]"
                    : "text-[#1A1A1A]/55 hover:text-[#1A1A1A] hover:bg-[#F4F4F4]/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right — CTA */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href={`/${user?.role}`}>
              <Button className="rounded-full bg-[#3B5BDB] text-white hover:bg-[#3B5BDB]/90 font-medium text-[13px] px-5 h-9 shadow-sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/register">
              <Button className="rounded-full bg-[#3B5BDB] text-white hover:bg-[#3B5BDB]/90 font-medium text-[13px] px-5 h-9 shadow-sm flex items-center gap-1.5">
                Become a client
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
              </Button>
            </Link>
          )}
          {/* Mobile toggle */}
          <button className="md:hidden p-2 rounded-full hover:bg-[#F4F4F4] transition" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5 text-[#1A1A1A]" /> : <Menu className="w-5 h-5 text-[#1A1A1A]" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mt-3 bg-white rounded-[20px] shadow-lg border border-[#E8E6E1] p-3 max-w-[1200px] mx-auto"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 text-sm font-medium px-4 py-3 rounded-xl transition-all ${
                    location === link.href ? "bg-[#F4F4F4] text-[#1A1A1A]" : "text-[#1A1A1A]/55 hover:bg-[#F4F4F4]/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            {!isAuthenticated && (
              <Link href="/register" onClick={() => setMobileOpen(false)} className="block mt-2 text-sm font-medium px-4 py-3 rounded-xl bg-[#3B5BDB] text-white text-center">
                Become a client
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

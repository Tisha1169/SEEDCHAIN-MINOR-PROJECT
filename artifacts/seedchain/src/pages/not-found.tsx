import { Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/page-transition";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <PageTransition className="min-h-screen bg-[#F7F7F7]">
      <Navbar />
      <div className="pt-40 pb-20 px-4 flex flex-col items-center justify-center text-center">
        <div className="text-7xl font-bold text-[#1A1A1A]/10 mb-4">404</div>
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Page Not Found</h1>
        <p className="text-[#1A1A1A]/50 text-sm mb-8">The page you're looking for doesn't exist.</p>
        <Link href="/">
          <button className="h-12 px-6 rounded-2xl bg-[#3FAF5E] text-white font-medium hover:bg-[#3FAF5E]/90 transition-colors flex items-center gap-2">
            <Home className="w-4 h-4" /> Back to Home
          </button>
        </Link>
      </div>
    </PageTransition>
  );
}

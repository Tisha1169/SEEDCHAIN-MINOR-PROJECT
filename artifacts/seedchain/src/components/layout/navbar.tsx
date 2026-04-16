import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
      <nav className="glass-pill flex items-center justify-between px-6 py-3 w-full max-w-5xl">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">SeedChain</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Home</Link>
          <Link href="#about" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">About</Link>
          <Link href="#platform" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Platform</Link>
          <Link href="#how-it-works" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">How it Works</Link>
          <Link href="#contact" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">Contact</Link>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link href={`/${user?.role}`}>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-foreground hover:text-primary transition-colors hidden sm:block">
                Log in
              </Link>
              <Link href="/register">
                <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium px-6">
                  Join Platform
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}

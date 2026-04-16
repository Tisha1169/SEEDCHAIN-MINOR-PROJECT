import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { AnimatedBackground } from "@/components/animated-background";
import { PageTransition, ScrollReveal } from "@/components/page-transition";
import { ArrowRight, CheckCircle2, ShieldCheck, ShoppingBag, Sprout, TrendingUp, Truck, Users, Warehouse } from "lucide-react";

export default function Landing() {
  return (
    <PageTransition className="min-h-screen bg-background relative overflow-hidden">
      <AnimatedBackground />
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal>
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6 border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-sm font-medium">SeedChain Platform Live</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
                Digital Infrastructure For The <span className="text-primary">Potato Seed</span> Supply Chain
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Connect farmers, cold storage, logistics, and buyers through a transparent, trackable digital ecosystem. Stripe meets farm-to-table.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-lg w-full sm:w-auto hover-lift hover-glow">
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-lg w-full sm:w-auto hover-lift border-2">
                    Explore Platform
                  </Button>
                </Link>
              </div>
              
              <div className="mt-12 flex items-center gap-8">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-12 h-12 rounded-full border-2 border-background bg-muted overflow-hidden">
                      <img src={`https://images.unsplash.com/photo-${1500000000000 + i}?auto=format&fit=crop&w=100&q=80`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm font-medium mt-1">Trusted by 500+ farmers</p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2} className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl transform rotate-3 scale-105 -z-10 blur-xl"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white p-2">
              <img 
                src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop&q=80" 
                alt="Agriculture" 
                className="w-full h-[500px] object-cover rounded-2xl"
              />
              
              {/* Floating Stat Cards */}
              <div className="absolute top-8 left-8 glass-pill p-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monthly Volume</p>
                    <p className="text-lg font-bold">120 Tons Tracked</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 right-8 glass-pill p-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Quality Control</p>
                    <p className="text-lg font-bold">Grade A Certified</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Stakeholders Section */}
      <section id="platform" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">One Platform For Every Stakeholder</h2>
              <p className="text-lg text-muted-foreground">Purpose-built tools for every node in the potato seed supply chain.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Farmers", icon: Sprout, desc: "Track planting, yields, and list harvest on the marketplace.", color: "bg-primary/10 text-primary border-primary/20" },
              { title: "Cold Storage", icon: Warehouse, desc: "Manage inventory, occupancy, and climate records.", color: "bg-accent/10 text-accent border-accent/20" },
              { title: "Logistics", icon: Truck, desc: "Accept delivery requests and provide real-time tracking.", color: "bg-secondary/20 text-secondary-foreground border-secondary/30" },
              { title: "Buyers", icon: ShoppingBag, desc: "Source verified seed batches with complete history.", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" }
            ].map((role, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="p-8 rounded-3xl bg-background border border-border hover-lift group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${role.color} transition-transform group-hover:scale-110`}>
                    <role.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{role.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{role.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Flow Diagram Section */}
      <section id="how-it-works" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">How The System Works</h2>
              <p className="text-lg text-muted-foreground">A unified chain of custody from seed to final buyer.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-border -translate-y-1/2 hidden md:block"></div>
              <div className="grid md:grid-cols-5 gap-8 relative z-10">
                {['Seed Supplier', 'Farmer', 'Cold Storage', 'Transport', 'Buyer'].map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-primary flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                      <span className="text-xl font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="font-bold">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <ScrollReveal>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">Ready to join the digital agriculture revolution?</h2>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 text-lg hover-lift hover-glow">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="rounded-full h-14 px-10 text-lg bg-white hover-lift border-2">
                  Sign In
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="font-bold text-xl">SeedChain</span>
          </div>
          <p className="text-muted-foreground">© 2025 SeedChain Inc. All rights reserved.</p>
        </div>
      </footer>
    </PageTransition>
  );
}

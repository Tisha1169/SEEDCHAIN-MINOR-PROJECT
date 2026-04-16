import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { AnimatedBackground } from "@/components/animated-background";
import { PageTransition, ScrollReveal } from "@/components/page-transition";
import { ArrowRight, AlertTriangle, Ban, ShieldCheck, ShoppingBag, Sprout, TrendingUp, Truck, Users, Warehouse, BarChart3, MapPin, Eye, Thermometer, LayoutDashboard, Package } from "lucide-react";

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
              <h1 className="text-[56px] lg:text-[64px] font-bold tracking-tight text-[#1A1A1A] leading-[1.1] mb-6">
                Digital Infrastructure For <span className="text-[#3FAF5E]">Modern Farmers</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Track potato seed supply chains from farm to buyer with transparency. Connect farmers, cold storage, logistics, and buyers in one digital ecosystem.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="#platform">
                  <Button size="lg" className="rounded-full bg-[#3FAF5E] text-white hover:bg-[#3FAF5E]/90 h-14 px-8 text-lg w-full sm:w-auto hover-lift hover-glow">
                    Explore Platform
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-lg w-full sm:w-auto hover-lift border-2">
                    Register Now
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
                      <svg key={i} className="w-5 h-5 text-[#8FD14F]" fill="currentColor" viewBox="0 0 20 20">
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
            <div className="absolute inset-0 bg-gradient-to-tr from-[#3FAF5E]/20 to-transparent rounded-3xl transform rotate-3 scale-105 -z-10 blur-xl"></div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white p-2">
              <img 
                src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop&q=80" 
                alt="Agriculture" 
                className="w-full h-[500px] object-cover rounded-2xl"
              />
              
              {/* Floating Stat Cards */}
              <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md border border-white/30 shadow-lg rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3FAF5E]/20 flex items-center justify-center text-[#3FAF5E]">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monthly Volume</p>
                    <p className="text-lg font-bold">120 Tons Tracked</p>
                  </div>
                </div>
              </div>

              <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-md border border-white/30 shadow-lg rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Users</p>
                    <p className="text-lg font-bold">2,400+ Stakeholders</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-md border border-white/30 shadow-lg rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
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

      {/* Problem Section */}
      <section id="about" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-red-600 mb-6 border border-red-100">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Current Challenges</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1A1A1A]">Supply Chain Problems We Solve</h2>
              <p className="text-lg text-muted-foreground">The potato seed supply chain faces critical inefficiencies that cost farmers and buyers billions annually.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "No Seed Traceability", icon: Eye, desc: "Seeds pass through multiple hands with zero visibility on origin, quality, or journey history.", color: "bg-red-50 text-red-500 border-red-100" },
              { title: "Post Harvest Loss", icon: Thermometer, desc: "Up to 30% of harvest is lost due to poor storage coordination and delayed cold chain access.", color: "bg-orange-50 text-orange-500 border-orange-100" },
              { title: "Too Many Middlemen", icon: Users, desc: "Excessive intermediaries inflate prices for buyers while reducing farmer income margins.", color: "bg-yellow-50 text-yellow-600 border-yellow-100" },
              { title: "Manual Logistics", icon: Ban, desc: "Paper-based tracking, phone calls, and manual coordination create delays and data loss.", color: "bg-purple-50 text-purple-500 border-purple-100" },
            ].map((problem, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="p-8 rounded-3xl bg-[#F7F7F7] border border-border hover-lift group h-full">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${problem.color} transition-transform group-hover:scale-110`}>
                    <problem.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-[#1A1A1A]">{problem.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{problem.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Solution Section */}
      <section id="platform" className="py-24 bg-[#F7F7F7] relative">
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] mb-6 border border-[#3FAF5E]/20">
                <Sprout className="w-4 h-4" />
                <span className="text-sm font-medium">Our Solution</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1A1A1A]">One Platform For Every Stakeholder</h2>
              <p className="text-lg text-muted-foreground">Purpose-built digital tools for every node in the potato seed supply chain.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Crop Tracking", icon: Sprout, desc: "End-to-end seed batch tracking from planting through harvest with quality grading and certifications.", color: "bg-[#3FAF5E]/10 text-[#3FAF5E] border-[#3FAF5E]/20" },
              { title: "Cold Storage Coordination", icon: Warehouse, desc: "Real-time inventory management, temperature monitoring, and slot allocation for storage facilities.", color: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20" },
              { title: "Transport Tracking", icon: Truck, desc: "Live shipment tracking with GPS updates, delivery status timeline, and route optimization.", color: "bg-[#8FD14F]/20 text-[#3FAF5E] border-[#8FD14F]/30" },
              { title: "Buyer Marketplace", icon: ShoppingBag, desc: "Browse verified seed batches with complete provenance, place orders, and track deliveries.", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" }
            ].map((solution, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="p-8 rounded-3xl bg-white border border-border hover-lift group shadow-sm h-full">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${solution.color} transition-transform group-hover:scale-110`}>
                    <solution.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-[#1A1A1A]">{solution.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{solution.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Supply Chain Flow Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] mb-6 border border-[#3B82F6]/20">
                <ArrowRight className="w-4 h-4" />
                <span className="text-sm font-medium">Supply Chain Flow</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1A1A1A]">How The System Works</h2>
              <p className="text-lg text-muted-foreground">A unified chain of custody from seed to final buyer, fully tracked at every step.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute top-10 left-[10%] right-[10%] h-1 bg-gradient-to-r from-[#3FAF5E] via-[#8FD14F] to-[#3B82F6] -translate-y-1/2 hidden md:block rounded-full"></div>
              <div className="grid md:grid-cols-5 gap-6 relative z-10">
                {[
                  { step: 'Seed Supplier', icon: Package, desc: 'Certified seed source' },
                  { step: 'Farmer', icon: Sprout, desc: 'Planting & harvest' },
                  { step: 'Cold Storage', icon: Warehouse, desc: 'Temperature controlled' },
                  { step: 'Transport', icon: Truck, desc: 'GPS tracked delivery' },
                  { step: 'Buyer', icon: ShoppingBag, desc: 'Verified purchase' },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-[#3FAF5E] flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-all group-hover:shadow-lg group-hover:border-[#3B82F6]">
                      <item.icon className="w-8 h-8 text-[#3FAF5E] group-hover:text-[#3B82F6] transition-colors" />
                    </div>
                    <p className="font-bold text-[#1A1A1A]">{item.step}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-24 bg-[#F7F7F7] relative">
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] mb-6 border border-[#3FAF5E]/20">
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm font-medium">Dashboard Previews</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1A1A1A]">Role-Based Dashboards</h2>
              <p className="text-lg text-muted-foreground">Each stakeholder gets a customized dashboard with real-time insights and actionable data.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                title: "Farmer Dashboard", 
                desc: "Track crops, record harvests, manage marketplace listings", 
                icon: Sprout,
                stats: [
                  { label: "Active Crops", value: "24" },
                  { label: "Total Harvest", value: "12.4t" },
                  { label: "Revenue", value: "$48K" },
                ],
                color: "#3FAF5E"
              },
              { 
                title: "Storage Dashboard", 
                desc: "Monitor inventory, temperature, incoming & outgoing batches", 
                icon: Warehouse,
                stats: [
                  { label: "Stored Batches", value: "156" },
                  { label: "Capacity", value: "78%" },
                  { label: "Avg Temp", value: "4°C" },
                ],
                color: "#3B82F6"
              },
              { 
                title: "Logistics Dashboard", 
                desc: "Manage deliveries, update shipment status, GPS tracking", 
                icon: Truck,
                stats: [
                  { label: "Active Routes", value: "18" },
                  { label: "Delivered", value: "342" },
                  { label: "On Time", value: "96%" },
                ],
                color: "#8FD14F"
              },
            ].map((dashboard, i) => (
              <ScrollReveal key={i} delay={i * 0.15}>
                <div className="rounded-3xl bg-white border border-border shadow-sm overflow-hidden hover-lift group">
                  <div className="p-6 pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${dashboard.color}20`, color: dashboard.color }}>
                        <dashboard.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1A1A1A]">{dashboard.title}</h3>
                        <p className="text-sm text-muted-foreground">{dashboard.desc}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {dashboard.stats.map((stat, j) => (
                        <div key={j} className="bg-[#F7F7F7] rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-[#1A1A1A]">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-t border-border">
                    <div className="flex gap-2 items-end px-6 w-full">
                      {[40, 65, 45, 80, 55, 70, 60, 90, 50, 75, 85, 65].map((h, k) => (
                        <div key={k} className="flex-1 rounded-t-sm transition-all group-hover:opacity-100 opacity-70" style={{ height: `${h}%`, backgroundColor: dashboard.color, maxHeight: '100px' }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#3FAF5E]/5"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <ScrollReveal>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight text-[#1A1A1A]">Ready to join the digital agriculture revolution?</h2>
            <p className="text-xl text-muted-foreground mb-10">Start tracking your supply chain today. Free for farmers.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="rounded-full bg-[#3FAF5E] text-white hover:bg-[#3FAF5E]/90 h-14 px-10 text-lg hover-lift hover-glow">
                  Create Free Account
                  <ArrowRight className="ml-2 w-5 h-5" />
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
      <footer id="contact" className="bg-white border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#3FAF5E] flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <span className="font-bold text-xl">SeedChain</span>
              </div>
              <p className="text-muted-foreground text-sm">Digital infrastructure for transparent agricultural supply chains.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-[#1A1A1A]">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-[#3FAF5E] transition-colors">For Farmers</Link></li>
                <li><Link href="/register" className="hover:text-[#3FAF5E] transition-colors">For Storage</Link></li>
                <li><Link href="/register" className="hover:text-[#3FAF5E] transition-colors">For Logistics</Link></li>
                <li><Link href="/register" className="hover:text-[#3FAF5E] transition-colors">For Buyers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-[#1A1A1A]">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#about" className="hover:text-[#3FAF5E] transition-colors">About</a></li>
                <li><a href="#how-it-works" className="hover:text-[#3FAF5E] transition-colors">How It Works</a></li>
                <li><a href="#platform" className="hover:text-[#3FAF5E] transition-colors">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-[#1A1A1A]">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>hello@seedchain.io</li>
                <li>+91 800 123 4567</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">© 2026 SeedChain Inc. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span className="hover:text-[#3FAF5E] cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-[#3FAF5E] cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </PageTransition>
  );
}

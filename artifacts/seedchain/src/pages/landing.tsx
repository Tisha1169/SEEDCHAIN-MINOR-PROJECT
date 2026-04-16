import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition, ScrollReveal } from "@/components/page-transition";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, TrendingUp, Truck, Warehouse, ShoppingBag, BarChart3, Shield, Sprout, ChevronDown, ArrowDown } from "lucide-react";

export default function Landing() {
  return (
    <PageTransition className="min-h-screen bg-[#E8E6E1] relative overflow-hidden">
      <Navbar />

      {/* ===== HERO — Exact reference image match ===== */}
      <section className="relative pt-28 pb-12 px-4 sm:px-6 max-w-[1360px] mx-auto">
        {/* Headline row */}
        <div className="flex items-end justify-between mb-10">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-[clamp(2.5rem,5.5vw,4rem)] font-bold tracking-tight text-[#1A1A1A] leading-[1.08]"
          >
            What Is Our Success?
          </motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="hidden sm:flex items-center gap-2 text-base text-[#1A1A1A]/60 whitespace-nowrap pb-2">
            <Link href="/about" className="hover:text-[#3FAF5E] transition-colors font-medium underline underline-offset-4 decoration-[#1A1A1A]/20">
              Learn More
            </Link>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </div>

        {/* Two-column hero */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-5 items-stretch">

          {/* ── LEFT COLUMN: Large image card ── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative rounded-[32px] overflow-hidden min-h-[520px] group"
          >
            {/* Hero image */}
            <img
              src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80"
              alt="Fresh carrot harvest"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            />
            {/* Soft gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            {/* Top-left overlay text */}
            <div className="absolute top-7 left-7 max-w-[300px]">
              <h2 className="text-[28px] md:text-[32px] font-bold text-white leading-[1.15]">
                New Opportunities<br />For <span className="text-[#D6F279]">Agricultural</span><br />Production
              </h2>
            </div>

            {/* Top-right pill badges */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="absolute top-7 right-7 flex flex-col gap-2.5"
            >
              <div className="bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-md">
                <div className="w-6 h-6 rounded-full bg-[#3FAF5E]/20 flex items-center justify-center">
                  <Sprout className="w-3.5 h-3.5 text-[#3FAF5E]" />
                </div>
                <span className="text-sm font-medium text-[#1A1A1A]">alv/ Fresh food</span>
              </div>
              <div className="bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-md">
                <span className="text-xs text-[#1A1A1A]/50">2026/</span>
                <span className="text-sm font-medium text-[#1A1A1A]">New harvest</span>
              </div>
            </motion.div>

            {/* Bottom-left stat card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="absolute bottom-7 left-7 bg-white rounded-[20px] p-5 shadow-xl w-[220px]"
            >
              <div className="flex items-baseline gap-1.5 mb-2.5">
                <span className="text-[40px] font-bold leading-none text-[#1A1A1A]">120</span>
                <span className="text-base font-medium text-[#1A1A1A]/50">tons</span>
              </div>
              {/* Progress dots row */}
              <div className="flex gap-[3px] mb-2.5">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className={`w-[7px] h-[7px] rounded-full ${i < 12 ? "bg-[#3FAF5E]" : i < 15 ? "bg-[#F59E0B]" : "bg-[#EF4444]"}`} />
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-[#1A1A1A]/50">
                of green crops per month thanks to the vertical farms
              </p>
            </motion.div>

            {/* Bottom-right stacked buttons */}
            <div className="absolute bottom-7 right-7 flex flex-col gap-2.5 items-center">
              <motion.div whileHover={{ scale: 1.1 }} className="w-11 h-11 rounded-full bg-[#3FAF5E] flex items-center justify-center shadow-lg cursor-pointer">
                <span className="text-white text-2xl leading-none">+</span>
              </motion.div>
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-lg">
                <ChevronDown className="w-5 h-5 text-[#3FAF5E]" />
              </div>
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-lg">
                <ChevronDown className="w-5 h-5 text-[#3FAF5E]" />
              </div>
            </div>

            {/* Scroll-down indicator */}
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="w-10 h-10 rounded-full bg-[#1A1A1A]/70 backdrop-blur flex items-center justify-center">
                <ArrowDown className="w-4 h-4 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* ── RIGHT COLUMN: Green panel with feature cards ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="rounded-[32px] overflow-hidden flex flex-col"
          >
            {/* Top half — header area with lime bg */}
            <div className="bg-[#E8E6E1] rounded-t-[32px] p-8 pb-4">
              <h2 className="text-[28px] md:text-[32px] font-bold text-[#1A1A1A] leading-[1.15] mb-1">
                Innovations In<br />Vertical Farming!
              </h2>
            </div>

            {/* Bottom half — two feature cards */}
            <div className="grid grid-cols-2 gap-3 px-3 pb-3 bg-[#E8E6E1] rounded-b-[32px] flex-1">
              {/* Card 1 — Left */}
              <motion.div whileHover={{ y: -4 }} className="relative rounded-[24px] overflow-hidden group cursor-pointer min-h-[300px] bg-[#D6F279]">
                <div className="absolute inset-0 bg-gradient-to-t from-[#2D5016]/80 via-transparent to-transparent z-10 pointer-events-none" />
                <img
                  src="https://t3.ftcdn.net/jpg/09/70/22/76/360_F_970227655_kcRO0B23kJACeob15rK2czWow7TAZ544.jpg"
                  alt="Fresh apples"
                  className="absolute inset-x-0 bottom-0 w-full h-3/4 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Top labels */}
                <div className="relative z-20 p-4">
                  <span className="text-[#2D5016] font-bold text-base leading-tight block">Less Water</span>
                  <span className="text-[#2D5016] font-bold text-base leading-tight block">And Pesticides</span>
                </div>
                {/* Bottom labels */}
                <div className="absolute bottom-4 left-4 z-20">
                  <span className="text-[#D6F279] font-semibold text-sm block">More Yield</span>
                  <span className="text-white font-semibold text-sm block">All Year Around</span>
                </div>
                <div className="absolute bottom-4 right-4 z-20">
                  <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1.5 text-white text-xs flex items-center gap-1.5 font-medium">
                    Explore <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                </div>
              </motion.div>

              {/* Card 2 — Right */}
              <motion.div whileHover={{ y: -4 }} className="relative rounded-[24px] overflow-hidden group cursor-pointer min-h-[300px] bg-[#3FAF5E]">
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A3A10]/80 via-transparent to-transparent z-10 pointer-events-none" />
                <img
                  src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=80"
                  alt="Asparagus stalks"
                  className="absolute inset-x-0 bottom-0 w-full h-3/4 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Top labels */}
                <div className="relative z-20 p-4">
                  <span className="text-[#D6F279] font-bold text-base leading-tight block">Minimum</span>
                  <span className="text-white font-bold text-base leading-tight block">Space Usage</span>
                </div>
                <div className="absolute top-4 right-4 z-20">
                  <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1.5 text-white text-xs flex items-center gap-1.5 font-medium">
                    More <span className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                </div>
                {/* Bottom labels */}
                <div className="absolute bottom-4 left-4 z-20">
                  <span className="text-[#D6F279] font-semibold text-sm block">Maximum</span>
                  <span className="text-white font-semibold text-sm block">Harvest In 2026</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="platform" className="py-24 px-4 max-w-[1400px] mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] mb-4 border border-[#3FAF5E]/20">
              <Leaf className="w-4 h-4" />
              <span className="text-sm font-semibold">Complete Supply Chain Platform</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
              Everything You Need To Track Seeds
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From planting to plate — monitor every step of the potato seed supply chain with full transparency
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Sprout, title: "Farm Management", desc: "Register farms, record crops, track harvests with digital precision", color: "#3FAF5E" },
            { icon: Warehouse, title: "Cold Storage", desc: "Monitor temperature-controlled storage with real-time slot tracking", color: "#3B82F6" },
            { icon: Truck, title: "Logistics Tracking", desc: "Live GPS tracking of shipments from farm to storage to buyer", color: "#F59E0B" },
            { icon: ShoppingBag, title: "Marketplace", desc: "Buy and sell certified potato seeds directly on the platform", color: "#8B5CF6" },
          ].map((feature, i) => (
            <ScrollReveal key={feature.title}>
              <motion.div
                whileHover={{ y: -8, boxShadow: "0 20px 40px -8px rgba(0,0,0,0.12)" }}
                className="bg-white rounded-[24px] p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-white/50 cursor-pointer transition-all duration-300 h-full"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 max-w-[1400px] mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
              Supply Chain Flow
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Five simple steps from farm to table
            </p>
          </div>
        </ScrollReveal>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {[
            { step: "01", label: "Plant & Grow", icon: Sprout, desc: "Farmers register seeds and record planting data" },
            { step: "02", label: "Harvest", icon: Leaf, desc: "Record harvest quality, weight, and grade" },
            { step: "03", label: "Store", icon: Warehouse, desc: "Cold storage facility receives and stores seeds" },
            { step: "04", label: "Transport", icon: Truck, desc: "Logistics partner picks up and delivers" },
            { step: "05", label: "Deliver", icon: ShoppingBag, desc: "Buyer receives certified potato seeds" },
          ].map((item, i) => (
            <ScrollReveal key={item.step}>
              <motion.div
                whileHover={{ y: -6 }}
                className="flex flex-col items-center text-center max-w-[200px]"
              >
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3FAF5E] to-[#8FD14F] flex items-center justify-center shadow-lg">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-[#3FAF5E] text-xs font-bold flex items-center justify-center shadow-md border-2 border-[#3FAF5E]/20">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-bold text-[#1A1A1A] mb-1">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {i < 4 && (
                  <div className="hidden md:block absolute">
                    <ArrowRight className="w-5 h-5 text-[#3FAF5E]/40" />
                  </div>
                )}
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-24 px-4 max-w-[1400px] mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
              Role-Based Dashboards
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Every stakeholder gets a purpose-built control center
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { role: "Farmer", metrics: ["Active Crops", "Total Harvest", "Revenue"], gradient: "from-[#3FAF5E] to-[#8FD14F]", desc: "Manage farms, track harvests, list on marketplace" },
            { role: "Storage", metrics: ["Capacity Used", "Incoming", "Stored Batches"], gradient: "from-[#3B82F6] to-[#60A5FA]", desc: "Monitor cold storage, manage inventory slots" },
            { role: "Logistics", metrics: ["Active Routes", "Delivered", "In Transit"], gradient: "from-[#F59E0B] to-[#FBBF24]", desc: "Track shipments, update GPS, manage deliveries" },
          ].map((dash) => (
            <ScrollReveal key={dash.role}>
              <motion.div
                whileHover={{ y: -8 }}
                className="bg-white rounded-[24px] overflow-hidden shadow-lg border border-white/50 cursor-pointer"
              >
                <div className={`bg-gradient-to-r ${dash.gradient} p-6`}>
                  <h3 className="text-white font-bold text-xl mb-1">{dash.role} Dashboard</h3>
                  <p className="text-white/80 text-sm">{dash.desc}</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {dash.metrics.map((m) => (
                      <div key={m} className="text-center p-3 rounded-xl bg-muted/50">
                        <div className="text-lg font-bold text-[#1A1A1A]">{Math.floor(Math.random() * 90) + 10}</div>
                        <div className="text-xs text-muted-foreground">{m}</div>
                      </div>
                    ))}
                  </div>
                  {/* Mini chart placeholder */}
                  <div className="h-16 bg-muted/30 rounded-xl flex items-end justify-around px-2 pb-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-4 rounded-t-md bg-gradient-to-t from-[#3FAF5E]/40 to-[#3FAF5E]"
                        style={{ height: `${20 + Math.random() * 80}%` }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 max-w-[1400px] mx-auto">
        <ScrollReveal>
          <div className="bg-gradient-to-br from-[#3FAF5E] to-[#2D8A45] rounded-[32px] p-12 md:p-20 text-center shadow-xl relative overflow-hidden">
            {/* Decorative */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#8FD14F]/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#D6F279]/20 rounded-full blur-3xl" />

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 relative z-10">
              Start Tracking Your Supply Chain Today
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 relative z-10">
              Join thousands of farmers, storage operators, logistics partners, and buyers on India's first potato seed tracking platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Link href="/register">
                <Button size="lg" className="rounded-full bg-white text-[#3FAF5E] hover:bg-white/90 h-14 px-10 text-lg font-semibold shadow-lg">
                  Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/tracking">
                <Button size="lg" variant="outline" className="rounded-full h-14 px-10 text-lg text-white border-white/30 hover:bg-white/10 font-semibold">
                  Track a Shipment
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 max-w-[1400px] mx-auto border-t border-border/40">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#3FAF5E] flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="font-bold text-2xl text-[#1A1A1A]">SeedChain</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              India's first digital potato seed supply chain tracking platform.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[#1A1A1A] mb-4">Platform</h4>
            <div className="flex flex-col gap-2.5">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-[#3FAF5E] transition-colors">About Platform</Link>
              <Link href="/how-it-works" className="text-sm text-muted-foreground hover:text-[#3FAF5E] transition-colors">How It Works</Link>
              <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-[#3FAF5E] transition-colors">Marketplace</Link>
              <Link href="/tracking" className="text-sm text-muted-foreground hover:text-[#3FAF5E] transition-colors">Track Shipment</Link>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-[#1A1A1A] mb-4">Roles</h4>
            <div className="flex flex-col gap-2.5">
              <Link href="/register" className="text-sm text-muted-foreground hover:text-[#3FAF5E] transition-colors">For Farmers</Link>
              <Link href="/register" className="text-sm text-muted-foreground hover:text-[#3FAF5E] transition-colors">For Storage Operators</Link>
              <Link href="/register" className="text-sm text-muted-foreground hover:text-[#3FAF5E] transition-colors">For Logistics</Link>
              <Link href="/register" className="text-sm text-muted-foreground hover:text-[#3FAF5E] transition-colors">For Buyers</Link>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-[#1A1A1A] mb-4">Legal</h4>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-muted-foreground">Privacy Policy</span>
              <span className="text-sm text-muted-foreground">Terms of Service</span>
              <span className="text-sm text-muted-foreground">Contact Us</span>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          © 2024 SeedChain. All rights reserved.
        </div>
      </footer>
    </PageTransition>
  );
}

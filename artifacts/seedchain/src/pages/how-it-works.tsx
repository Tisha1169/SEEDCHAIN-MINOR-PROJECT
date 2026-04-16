import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition, ScrollReveal } from "@/components/page-transition";
import { motion } from "framer-motion";
import { Sprout, Warehouse, Truck, ShoppingBag, ArrowRight, CheckCircle, Leaf } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Sprout,
    title: "Register & Plant",
    desc: "Farmers register their farms, record seed batches, and log planting data. Every seed gets a unique digital identity on the platform.",
    details: ["Create farm profile", "Register seed batches", "Record planting dates", "Set expected harvest"],
    color: "#3FAF5E",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80",
  },
  {
    step: "02",
    icon: Leaf,
    title: "Harvest & Grade",
    desc: "When crops are ready, farmers record harvest data including weight, quality grade, and field conditions. Quality certificates are generated automatically.",
    details: ["Record harvest weight", "Assign quality grade (A/B/C)", "Generate batch certificate", "List on marketplace"],
    color: "#8FD14F",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80",
  },
  {
    step: "03",
    icon: Warehouse,
    title: "Store Safely",
    desc: "Harvested batches are sent to registered cold storage facilities. Operators manage inventory, monitor temperature, and assign storage slots.",
    details: ["Accept incoming shipments", "Assign storage slots", "Monitor temperature", "Track inventory levels"],
    color: "#3B82F6",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80",
  },
  {
    step: "04",
    icon: Truck,
    title: "Ship & Track",
    desc: "Logistics partners pick up batches and deliver them. Real-time GPS tracking shows the exact location and status of every shipment.",
    details: ["Accept delivery jobs", "Update GPS location", "Track in real-time", "Confirm delivery"],
    color: "#F59E0B",
    image: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=600&q=80",
  },
  {
    step: "05",
    icon: ShoppingBag,
    title: "Buy & Verify",
    desc: "Buyers browse the marketplace, place orders, and receive certified potato seeds with full traceability back to the farm of origin.",
    details: ["Browse marketplace", "Place orders", "Track delivery", "Verify seed origin"],
    color: "#8B5CF6",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
  },
];

export default function HowItWorks() {
  return (
    <PageTransition className="min-h-screen bg-[#E8E6E1]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 max-w-[1400px] mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] mb-6 border border-[#3FAF5E]/20">
            <span className="text-sm font-semibold">5 Simple Steps</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-[#1A1A1A] mb-6">
            How SeedChain <span className="text-[#3FAF5E]">Works</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From seed to sale, every step is tracked, verified, and transparent. Here's the complete journey.
          </p>
        </motion.div>
      </section>

      {/* Steps */}
      <section className="py-8 px-4 max-w-[1400px] mx-auto">
        {steps.map((step, i) => (
          <ScrollReveal key={step.step}>
            <div className={`flex flex-col ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 mb-16 items-center`}>
              {/* Image */}
              <motion.div whileHover={{ scale: 1.02 }} className="lg:w-1/2">
                <div className="rounded-[32px] overflow-hidden shadow-xl relative h-[320px]">
                  <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{ backgroundColor: step.color }}>
                      {step.step}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Content */}
              <div className="lg:w-1/2">
                <div className="bg-white rounded-[24px] p-8 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${step.color}15` }}>
                      <step.icon className="w-6 h-6" style={{ color: step.color }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: step.color }}>Step {step.step}</div>
                      <h3 className="text-2xl font-bold text-[#1A1A1A]">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-6">{step.desc}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {step.details.map((d) => (
                      <div key={d} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#3FAF5E] shrink-0" />
                        <span className="text-sm text-[#1A1A1A]">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </section>

      {/* CTA */}
      <section className="py-24 px-4 max-w-[1400px] mx-auto">
        <ScrollReveal>
          <div className="bg-gradient-to-br from-[#3FAF5E] to-[#2D8A45] rounded-[32px] p-16 text-center shadow-xl">
            <h2 className="text-4xl font-bold text-white mb-4">Ready To Join The Chain?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">Register for free and start tracking your potato seed supply chain today.</p>
            <Link href="/register">
              <Button size="lg" className="rounded-full bg-white text-[#3FAF5E] hover:bg-white/90 h-14 px-10 text-lg font-semibold shadow-lg">
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </PageTransition>
  );
}

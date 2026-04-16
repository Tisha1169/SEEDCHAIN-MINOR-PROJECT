import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition, ScrollReveal } from "@/components/page-transition";
import { motion } from "framer-motion";
import { Shield, Globe, Users, BarChart3, Leaf, ArrowRight } from "lucide-react";

export default function About() {
  return (
    <PageTransition className="min-h-screen bg-[#E8E6E1]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] mb-6 border border-[#3FAF5E]/20">
            <Leaf className="w-4 h-4" />
            <span className="text-sm font-semibold">About SeedChain</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-[#1A1A1A] mb-6 leading-tight">
            Transforming Agriculture With <span className="text-[#3FAF5E]">Digital Trust</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            SeedChain is India's first end-to-end potato seed supply chain tracking platform. We connect farmers, storage operators, logistics providers, and buyers in a transparent digital ecosystem.
          </p>
        </motion.div>
      </section>

      {/* Mission Cards */}
      <section className="py-16 px-4 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-8">
          <ScrollReveal>
            <motion.div whileHover={{ y: -6 }} className="bg-white rounded-[32px] p-10 shadow-lg h-full">
              <div className="w-16 h-16 rounded-2xl bg-[#3FAF5E]/10 flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-[#3FAF5E]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">Our Mission</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                To eliminate seed fraud, reduce post-harvest losses, and create fair market access for small-scale potato farmers across India by providing complete supply chain visibility.
              </p>
            </motion.div>
          </ScrollReveal>
          <ScrollReveal>
            <motion.div whileHover={{ y: -6 }} className="bg-white rounded-[32px] p-10 shadow-lg h-full">
              <div className="w-16 h-16 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center mb-6">
                <Globe className="w-8 h-8 text-[#3B82F6]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">Our Vision</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                A future where every potato seed can be traced from the farm it was grown on to the buyer who purchases it — creating accountability and trust at every step.
              </p>
            </motion.div>
          </ScrollReveal>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 max-w-[1400px] mx-auto">
        <ScrollReveal>
          <div className="bg-gradient-to-r from-[#3FAF5E] to-[#8FD14F] rounded-[32px] p-12 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "500+", label: "Registered Farmers" },
              { value: "120", label: "Tons Tracked Monthly" },
              { value: "50+", label: "Storage Facilities" },
              { value: "99.9%", label: "Tracking Accuracy" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-white/80 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Team/Values */}
      <section className="py-16 px-4 max-w-[1400px] mx-auto">
        <ScrollReveal>
          <h2 className="text-4xl font-bold text-[#1A1A1A] text-center mb-12">Our Core Values</h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: "Transparency", desc: "Every transaction, every movement, every quality check — visible to all stakeholders in the chain." },
            { icon: Users, title: "Farmer First", desc: "We build technology that empowers farmers, giving them fair access to markets and reducing middlemen." },
            { icon: BarChart3, title: "Data-Driven", desc: "Make smarter decisions with real-time analytics, harvest trends, and supply chain insights." },
          ].map((v) => (
            <ScrollReveal key={v.title}>
              <motion.div whileHover={{ y: -6 }} className="bg-white rounded-[24px] p-8 shadow-lg">
                <v.icon className="w-10 h-10 text-[#3FAF5E] mb-4" />
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{v.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 max-w-[1400px] mx-auto">
        <ScrollReveal>
          <div className="bg-white rounded-[32px] p-12 text-center shadow-lg">
            <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4">Ready To Get Started?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Join the SeedChain platform and take control of your supply chain.</p>
            <Link href="/register">
              <Button size="lg" className="rounded-full bg-[#3FAF5E] text-white hover:bg-[#3FAF5E]/90 h-14 px-10 text-lg font-semibold">
                Create Account <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </PageTransition>
  );
}

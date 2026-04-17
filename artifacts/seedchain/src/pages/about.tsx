import { Navbar } from "@/components/layout/navbar";
import { PageTransition, ScrollReveal } from "@/components/page-transition";
import { Leaf, Shield, Globe, Users } from "lucide-react";
import { motion } from "framer-motion";

const values = [
  { icon: Leaf, title: "Sustainable Agriculture", desc: "Supporting eco-friendly farming practices through digital supply chain management." },
  { icon: Shield, title: "Full Traceability", desc: "Every potato batch is tracked from seed to shelf with QR codes and RFID tags." },
  { icon: Globe, title: "Nationwide Network", desc: "Connecting farmers, storage operators, logistics providers, and buyers across India." },
  { icon: Users, title: "Empowering Farmers", desc: "Giving farmers direct access to markets with transparent pricing and digital identities." },
];

export default function About() {
  return (
    <PageTransition className="min-h-screen bg-[#E8E6E1]">
      <Navbar />
      <div className="pt-32 pb-20 px-4 sm:px-6 max-w-[1100px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] mb-4 border border-[#3FAF5E]/20">
            <Leaf className="w-4 h-4" />
            <span className="text-sm font-semibold">About SeedChain</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">Revolutionizing Agricultural Supply Chain</h1>
          <p className="text-lg text-[#1A1A1A]/50 max-w-2xl mx-auto">
            SeedChain is a comprehensive digital platform that tracks potato crops from seed to shelf, 
            ensuring quality, transparency, and efficiency across the entire supply chain.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5 mb-16">
          {values.map((v, i) => (
            <ScrollReveal key={v.title} delay={i * 0.1}>
              <motion.div whileHover={{ y: -4 }} className="bg-white rounded-[28px] p-7 shadow-sm border border-[#E8E6E1]/60">
                <div className="w-12 h-12 rounded-2xl bg-[#3FAF5E]/10 flex items-center justify-center mb-4">
                  <v.icon className="w-6 h-6 text-[#3FAF5E]" />
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{v.title}</h3>
                <p className="text-sm text-[#1A1A1A]/50 leading-relaxed">{v.desc}</p>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="bg-gradient-to-br from-[#3FAF5E] to-[#2D8A45] rounded-[32px] p-10 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-white/80 max-w-2xl mx-auto text-lg leading-relaxed">
              To create a transparent, efficient, and trustworthy agricultural supply chain that benefits 
              every stakeholder — from the farmer who plants the seed to the buyer who receives fresh produce.
            </p>
            <div className="grid grid-cols-3 gap-8 mt-10 max-w-lg mx-auto">
              {[["48+", "Batches Tracked"], ["24+", "Active Farmers"], ["₹18L+", "Revenue Generated"]].map(([val, label]) => (
                <div key={label}>
                  <div className="text-3xl font-bold">{val}</div>
                  <div className="text-xs text-white/60 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </PageTransition>
  );
}

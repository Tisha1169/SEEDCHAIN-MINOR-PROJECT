import { Navbar } from "@/components/layout/navbar";
import { PageTransition, ScrollReveal } from "@/components/page-transition";
import { motion } from "framer-motion";
import { Sprout, Warehouse, Truck, ShoppingBag, QrCode, BarChart3 } from "lucide-react";

const steps = [
  { step: 1, icon: Sprout, title: "Farmer Registers Crop", desc: "Farmer creates a digital batch identity with auto-generated QR code and RFID tag. Every batch gets a unique ID like BATCH-2026-0001.", color: "#3FAF5E" },
  { step: 2, icon: QrCode, title: "Harvest Recorded", desc: "When the crop is harvested, the farmer logs yield quantity, grade, and date. A supply chain tracking event is created automatically.", color: "#3B82F6" },
  { step: 3, icon: Warehouse, title: "Cold Storage", desc: "The batch is shipped to cold storage. The operator scans the QR/RFID to accept the shipment — temperature and humidity are monitored.", color: "#8B5CF6" },
  { step: 4, icon: Truck, title: "Logistics & Transport", desc: "Logistics operators pick up the batch for delivery. Real-time location tracking updates the supply chain timeline.", color: "#F59E0B" },
  { step: 5, icon: ShoppingBag, title: "Buyer Receives Delivery", desc: "Buyers browse the marketplace, place orders, and receive fully tracked produce with complete provenance data.", color: "#EF4444" },
  { step: 6, icon: BarChart3, title: "Full Transparency", desc: "Every step is visible on the tracking page. Admin can monitor the entire supply chain from a single dashboard.", color: "#1A1A1A" },
];

export default function HowItWorks() {
  return (
    <PageTransition className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <div className="pt-32 pb-20 px-4 sm:px-6 max-w-[1000px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">How It Works</h1>
          <p className="text-lg text-[#1A1A1A]/50 max-w-2xl mx-auto">
            From planting to delivery — every step digitally tracked and verified
          </p>
        </motion.div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-[2px] bg-[#E8E6E1] hidden sm:block" />
          
          <div className="space-y-6">
            {steps.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 0.1}>
                <div className="flex gap-5 items-start">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm relative z-10"
                    style={{ backgroundColor: `${s.color}15` }}>
                    <s.icon className="w-6 h-6" style={{ color: s.color }} />
                  </div>
                  <motion.div whileHover={{ y: -3 }} className="flex-1 bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                        Step {s.step}
                      </span>
                      <h3 className="text-lg font-bold text-[#1A1A1A]">{s.title}</h3>
                    </div>
                    <p className="text-sm text-[#1A1A1A]/50 leading-relaxed">{s.desc}</p>
                  </motion.div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

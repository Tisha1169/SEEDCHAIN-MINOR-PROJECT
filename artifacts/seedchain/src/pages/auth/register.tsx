import { useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { UserPlus, Eye, EyeOff, Sprout } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const roles = [
  { value: "farmer", label: "Farmer", desc: "Grow & sell crops", color: "#3FAF5E" },
  { value: "storage", label: "Storage Operator", desc: "Manage cold storage", color: "#3B82F6" },
  { value: "logistics", label: "Logistics", desc: "Transport shipments", color: "#F59E0B" },
  { value: "buyer", label: "Buyer", desc: "Purchase produce", color: "#8B5CF6" },
];

export default function Register() {
  const { register: doRegister } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "farmer" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await doRegister(form.email, form.password, form.name, form.role);
      toast({ title: "Account Created!", description: "Welcome to SeedChain" });
    } catch {
      toast({ title: "Error", description: "Registration failed", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <PageTransition className="min-h-screen bg-[#F7F7F7]">
      <Navbar />
      <div className="pt-28 pb-20 px-4 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#E8E6E1]/60">
            <div className="flex items-center justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3FAF5E] to-[#8FD14F] flex items-center justify-center shadow-md">
                <Sprout className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] text-center mb-1">Create Account</h1>
            <p className="text-sm text-[#1A1A1A]/40 text-center mb-6">Join the SeedChain supply chain network</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Full Name</label>
                <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name"
                  className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Email</label>
                <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com"
                  className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" minLength={6}
                    className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 pr-12 text-sm focus:outline-none focus:border-[#3FAF5E]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1A1A1A]/30">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-2 block">Your Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map(r => (
                    <label key={r.value} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${form.role === r.value ? "border-[#3FAF5E] bg-[#3FAF5E]/5" : "border-[#E8E6E1] hover:border-[#3FAF5E]/40"}`}>
                      <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="accent-[#3FAF5E]" />
                      <div>
                        <div className="text-sm font-semibold text-[#1A1A1A]">{r.label}</div>
                        <div className="text-[10px] text-[#1A1A1A]/40">{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-2xl bg-[#3FAF5E] text-white font-semibold hover:bg-[#3FAF5E]/90 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> {loading ? "Creating..." : "Create Account"}
              </button>
            </form>
            <p className="text-center text-sm text-[#1A1A1A]/40 mt-5">
              Already have an account? <Link href="/login" className="text-[#3FAF5E] font-medium hover:underline">Sign In</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}

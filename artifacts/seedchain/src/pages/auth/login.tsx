import { useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/page-transition";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { LogIn, Eye, EyeOff, Sprout } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const demoAccounts = [
  { email: "rajesh@farmer.com", role: "Farmer", color: "#3FAF5E" },
  { email: "storage@coolstore.com", role: "Storage", color: "#3B82F6" },
  { email: "logistics@fasttrack.com", role: "Logistics", color: "#F59E0B" },
  { email: "buyer@greenmart.com", role: "Buyer", color: "#8B5CF6" },
  { email: "admin@seedchain.io", role: "Admin", color: "#EF4444" },
];

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      toast({ title: "Login Failed", description: "Invalid email or password. Try a demo account below.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setLoading(true);
    try {
      await login(demoEmail, "demo123");
    } catch {
      toast({ title: "Error", description: "Could not login", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <PageTransition className="min-h-screen bg-[#F7F7F7]">
      <Navbar />
      <div className="pt-32 pb-20 px-4 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#E8E6E1]/60">
            <div className="flex items-center justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3FAF5E] to-[#8FD14F] flex items-center justify-center shadow-md">
                <Sprout className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] text-center mb-1">Welcome Back</h1>
            <p className="text-sm text-[#1A1A1A]/40 text-center mb-6">Sign in to your SeedChain account</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                  className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 text-sm focus:outline-none focus:border-[#3FAF5E]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1A1A1A]/60 uppercase tracking-wide mb-1.5 block">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                    className="w-full h-12 rounded-2xl border border-[#E8E6E1] bg-[#F7F7F7] px-4 pr-12 text-sm focus:outline-none focus:border-[#3FAF5E]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1A1A1A]/30">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-2xl bg-[#3FAF5E] text-white font-semibold hover:bg-[#3FAF5E]/90 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-[#1A1A1A]/40 mt-5">
              Don't have an account? <Link href="/register" className="text-[#3FAF5E] font-medium hover:underline">Register</Link>
            </p>
          </div>

          {/* Demo accounts */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-5 bg-white rounded-[24px] p-5 shadow-sm border border-[#E8E6E1]/60">
            <h3 className="text-xs font-semibold text-[#1A1A1A]/40 uppercase tracking-wide mb-3">Demo Accounts — Click to Login</h3>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(d => (
                <button key={d.email} onClick={() => handleDemoLogin(d.email)} disabled={loading}
                  className="text-left p-3 rounded-xl border border-[#E8E6E1]/60 hover:border-[#3FAF5E]/40 hover:shadow-sm transition-all disabled:opacity-50">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${d.color}15`, color: d.color }}>
                    {d.role}
                  </span>
                  <div className="text-xs text-[#1A1A1A]/60 mt-1 truncate">{d.email}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}

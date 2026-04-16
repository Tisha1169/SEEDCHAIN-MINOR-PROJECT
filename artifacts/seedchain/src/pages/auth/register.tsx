import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { PageTransition } from "@/components/page-transition";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sprout } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["farmer", "storage", "logistics", "buyer"]),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const roles = [
  { value: "farmer", label: "Farmer", desc: "Grow & sell potato seeds", emoji: "🌱" },
  { value: "storage", label: "Storage Operator", desc: "Manage cold storage", emoji: "🏭" },
  { value: "logistics", label: "Logistics Partner", desc: "Transport shipments", emoji: "🚛" },
  { value: "buyer", label: "Buyer", desc: "Purchase certified seeds", emoji: "🛒" },
] as const;

export default function Register() {
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "farmer" },
  });

  const selectedRole = form.watch("role");

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      await registerUser(data.email, data.password, data.name, data.role);
      toast({ title: "Welcome to SeedChain!", description: "Your account has been created. Let's set up your profile." });
    } catch {
      toast({ title: "Registration failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="min-h-screen bg-[#E8E6E1] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[480px]"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-white/40">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-full bg-[#3FAF5E] flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-2xl text-[#1A1A1A]">SeedChain</span>
          </div>

          <h1 className="text-2xl font-bold text-center text-[#1A1A1A] mb-2">Create Your Account</h1>
          <p className="text-center text-muted-foreground mb-8">Join the seed supply chain platform</p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="text-sm font-medium text-[#1A1A1A] mb-2 block">Select Your Role</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => form.setValue("role", role.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedRole === role.value
                        ? "border-[#3FAF5E] bg-[#3FAF5E]/5 shadow-md"
                        : "border-transparent bg-muted/50 hover:bg-muted/80"
                    }`}
                  >
                    <span className="text-lg">{role.emoji}</span>
                    <span className="font-semibold text-sm text-[#1A1A1A] block">{role.label}</span>
                    <span className="text-xs text-muted-foreground">{role.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#1A1A1A] mb-1.5 block">Full Name</label>
              <Input
                {...form.register("name")}
                placeholder="John Doe"
                className="h-12 rounded-xl bg-muted/50 border-0 text-base"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-[#1A1A1A] mb-1.5 block">Email</label>
              <Input
                {...form.register("email")}
                type="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl bg-muted/50 border-0 text-base"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-[#1A1A1A] mb-1.5 block">Password</label>
              <Input
                {...form.register("password")}
                type="password"
                placeholder="••••••••"
                className="h-12 rounded-xl bg-muted/50 border-0 text-base"
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-[#3FAF5E] text-white hover:bg-[#3FAF5E]/90 font-semibold text-base">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-[#3FAF5E] font-semibold hover:underline">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}

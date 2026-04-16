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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
    } catch {
      toast({ title: "Login failed", description: "Please check your credentials and try again.", variant: "destructive" });
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
        className="w-full max-w-[440px]"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-white/40">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-full bg-[#3FAF5E] flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-2xl text-[#1A1A1A]">SeedChain</span>
          </div>

          <h1 className="text-2xl font-bold text-center text-[#1A1A1A] mb-2">Welcome Back</h1>
          <p className="text-center text-muted-foreground mb-8">Sign in to your account</p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-[#3FAF5E] font-semibold hover:underline">Register now</Link>
          </div>

          {/* Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs text-center text-muted-foreground mb-3 font-medium uppercase tracking-wider">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Admin", email: "admin@seedchain.io", password: "admin123" },
                { label: "Farmer", email: "rajesh@farmer.com", password: "farmer123" },
                { label: "Storage", email: "storage@coolstore.com", password: "storage123" },
                { label: "Buyer", email: "buyer@greenmart.com", password: "buyer123" },
              ].map((cred) => (
                <button
                  key={cred.label}
                  type="button"
                  onClick={() => {
                    form.setValue("email", cred.email);
                    form.setValue("password", cred.password);
                  }}
                  className="text-left p-3 rounded-xl bg-muted/50 hover:bg-[#3FAF5E]/5 hover:border-[#3FAF5E]/20 border border-transparent transition-all text-xs"
                >
                  <span className="font-semibold text-[#1A1A1A] block">{cred.label}</span>
                  <span className="text-muted-foreground">{cred.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}

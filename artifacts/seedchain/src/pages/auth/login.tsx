import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { PageTransition } from "@/components/page-transition";
import { AnimatedBackground } from "@/components/animated-background";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLoginUser();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: (response) => {
          login(response.token, response.user);
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
        },
        onError: (error) => {
          toast({
            title: "Login failed",
            description: "Please check your credentials and try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <PageTransition className="min-h-screen flex items-center justify-center relative px-4">
      <AnimatedBackground />
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Log in to manage your supply chain</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="bg-white/50"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              className="bg-white/50"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 text-lg"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Register now
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50">
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
                className="text-left p-2 rounded-xl bg-muted/50 hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all text-xs"
              >
                <span className="font-semibold text-foreground block">{cred.label}</span>
                <span className="text-muted-foreground">{cred.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

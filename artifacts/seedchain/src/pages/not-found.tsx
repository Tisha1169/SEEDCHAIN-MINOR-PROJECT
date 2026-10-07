import { Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-md px-4 pt-40 text-center">
        <h1 className="text-5xl font-medium">404</h1>
        <p className="mt-2 text-ink/60">This page does not exist.</p>
        <Link href="/"><Button className="mt-6 rounded-full">Go home</Button></Link>
      </div>
    </div>
  );
}

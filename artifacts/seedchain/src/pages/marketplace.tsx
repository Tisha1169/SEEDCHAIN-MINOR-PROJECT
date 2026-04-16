import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition, ScrollReveal } from "@/components/page-transition";
import { motion } from "framer-motion";
import { Search, Filter, Star, MapPin, ShoppingBag, ArrowRight, Leaf, Shield } from "lucide-react";

const listings = [
  { id: 1, variety: "Kufri Jyoti", grade: "A", qty: "2,500 kg", price: "₹24/kg", location: "Punjab", farmer: "Rajesh Kumar", image: "https://images.unsplash.com/photo-1518977676601-b53f82ber5f7?auto=format&fit=crop&w=400&q=80" },
  { id: 2, variety: "Kufri Pukhraj", grade: "A", qty: "1,800 kg", price: "₹28/kg", location: "UP", farmer: "Sunil Sharma", image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80" },
  { id: 3, variety: "Kufri Badshah", grade: "B", qty: "3,200 kg", price: "₹20/kg", location: "Gujarat", farmer: "Amit Patel", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=80" },
  { id: 4, variety: "Kufri Chipsona", grade: "A", qty: "1,200 kg", price: "₹32/kg", location: "Himachal", farmer: "Vikram Singh", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80" },
  { id: 5, variety: "Kufri Jyoti", grade: "B", qty: "4,000 kg", price: "₹22/kg", location: "Bihar", farmer: "Ravi Yadav", image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80" },
  { id: 6, variety: "Kufri Pukhraj", grade: "A", qty: "2,000 kg", price: "₹26/kg", location: "MP", farmer: "Ajay Tiwari", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=80" },
];

export default function Marketplace() {
  return (
    <PageTransition className="min-h-screen bg-[#E8E6E1]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-8 px-4 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3FAF5E]/10 text-[#3FAF5E] mb-6 border border-[#3FAF5E]/20">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-sm font-semibold">SeedChain Marketplace</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-[#1A1A1A] mb-6">
            Buy Certified <span className="text-[#3FAF5E]">Potato Seeds</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Browse verified listings from registered farmers. Every seed batch comes with full traceability.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-3xl mx-auto mb-12">
          <div className="bg-white rounded-[24px] p-3 shadow-lg flex gap-3 items-center">
            <div className="flex-1 flex items-center gap-3 px-4">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input type="text" placeholder="Search by variety, location, or farmer..." className="w-full bg-transparent outline-none text-lg" />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <Filter className="w-5 h-5 text-muted-foreground" />
              </button>
              <Button className="rounded-xl bg-[#3FAF5E] text-white hover:bg-[#3FAF5E]/90 h-12 px-6 font-semibold">
                Search
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {["All Varieties", "Kufri Jyoti", "Kufri Pukhraj", "Kufri Badshah", "Kufri Chipsona", "Grade A", "Grade B"].map((f, i) => (
            <button
              key={f}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                i === 0 ? "bg-[#3FAF5E] text-white shadow-md" : "bg-white text-muted-foreground hover:bg-white/80 shadow-sm"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Listings Grid */}
      <section className="px-4 max-w-[1400px] mx-auto pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item, i) => (
            <ScrollReveal key={item.id}>
              <motion.div
                whileHover={{ y: -6 }}
                className="bg-white rounded-[24px] overflow-hidden shadow-lg cursor-pointer group"
              >
                <div className="relative h-48 overflow-hidden">
                  <img src={item.image} alt={item.variety} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-white/90 backdrop-blur-md rounded-full px-3 py-1 text-xs font-bold text-[#3FAF5E]">
                      Grade {item.grade}
                    </span>
                    <span className="bg-[#3FAF5E]/90 backdrop-blur-md rounded-full px-3 py-1 text-xs font-bold text-white flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Verified
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-[#1A1A1A]">{item.variety}</h3>
                    <span className="text-lg font-bold text-[#3FAF5E]">{item.price}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{item.location}</span>
                    <span className="mx-1">•</span>
                    <Leaf className="w-4 h-4" />
                    <span>{item.qty}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-bold">{item.farmer[0]}</span>
                      </div>
                      <span className="text-sm font-medium text-[#1A1A1A]">{item.farmer}</span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        {/* Load more */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="rounded-full h-12 px-8 font-semibold border-2">
            Load More Listings
          </Button>
        </div>
      </section>

      {/* Seller CTA */}
      <section className="py-24 px-4 max-w-[1400px] mx-auto">
        <ScrollReveal>
          <div className="bg-white rounded-[32px] p-12 flex flex-col md:flex-row items-center gap-8 shadow-lg">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4">Are You A Farmer?</h2>
              <p className="text-muted-foreground text-lg mb-6">List your potato seeds on the marketplace and connect directly with buyers. No middlemen, fair prices.</p>
              <Link href="/register">
                <Button size="lg" className="rounded-full bg-[#3FAF5E] text-white hover:bg-[#3FAF5E]/90 h-14 px-10 text-lg font-semibold">
                  Start Selling <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
            <div className="w-64 h-64 rounded-[24px] overflow-hidden shadow-lg shrink-0">
              <img src="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80" alt="Farmer" className="w-full h-full object-cover" />
            </div>
          </div>
        </ScrollReveal>
      </section>
    </PageTransition>
  );
}

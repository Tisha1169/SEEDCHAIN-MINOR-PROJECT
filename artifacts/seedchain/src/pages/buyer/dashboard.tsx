import { motion } from "framer-motion";
import { ShoppingCart, Package, Star, TrendingUp, ArrowUpRight, ArrowDownRight, Heart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Link } from "wouter";

const orderData = [
  { month: "Jan", orders: 8 }, { month: "Feb", orders: 12 }, { month: "Mar", orders: 18 },
  { month: "Apr", orders: 24 }, { month: "May", orders: 20 }, { month: "Jun", orders: 28 },
  { month: "Jul", orders: 32 },
];

const varietyPreferences = [
  { name: "Jyoti", value: 14 }, { name: "Pukhraj", value: 10 }, { name: "Badshah", value: 8 },
  { name: "Chipsona", value: 6 },
];

const recentOrders = [
  { id: "ORD-2041", variety: "Kufri Jyoti", quantity: "5,000 kg", price: "₹72,500", status: "delivered", date: "1 day ago" },
  { id: "ORD-2040", variety: "Kufri Pukhraj", quantity: "3,000 kg", price: "₹48,000", status: "in-transit", date: "3 days ago" },
  { id: "ORD-2039", variety: "Kufri Badshah", quantity: "2,500 kg", price: "₹35,000", status: "processing", date: "5 days ago" },
  { id: "ORD-2038", variety: "Kufri Chipsona", quantity: "4,000 kg", price: "₹60,000", status: "delivered", date: "1 week ago" },
];

const metrics = [
  { label: "Total Orders", value: "142", change: "+24.5%", positive: true, icon: ShoppingCart, gradient: "from-[#8B5CF6] to-[#A78BFA]" },
  { label: "Active Orders", value: "8", change: "+3", positive: true, icon: Package, gradient: "from-[#3FAF5E] to-[#8FD14F]" },
  { label: "Avg Rating", value: "4.8", change: "+0.2", positive: true, icon: Star, gradient: "from-[#F59E0B] to-[#FBBF24]" },
  { label: "Total Spent", value: "₹12.4L", change: "+32%", positive: true, icon: TrendingUp, gradient: "from-[#3B82F6] to-[#60A5FA]" },
];

export default function BuyerDashboard() {
  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4, boxShadow: "0 20px 40px -8px rgba(0,0,0,0.12)" }}
            className="bg-white rounded-[20px] p-5 shadow-sm border border-border/50 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-md`}>
                <m.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#3FAF5E]">
                <ArrowUpRight className="w-3 h-3" />
                {m.change}
              </div>
            </div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Spending Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] rounded-[20px] p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/80">Spending Summary</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">This Quarter</span>
          </div>
          <div className="text-center mb-6">
            <div className="text-4xl font-bold mb-1">₹12.4L</div>
            <div className="text-sm text-white/70">Total procurement value</div>
          </div>
          <div className="space-y-3">
            {[
              { label: "Kufri Jyoti", amount: "₹5.2L", pct: 42 },
              { label: "Kufri Pukhraj", amount: "₹3.8L", pct: 31 },
              { label: "Others", amount: "₹3.4L", pct: 27 },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="text-white/80">{item.amount}</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full">
                  <div className="h-2 bg-white rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Order History Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A]">Order History</h3>
              <p className="text-xs text-muted-foreground">Monthly orders placed</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={orderData}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#999" />
              <YAxis tick={{ fontSize: 12 }} stroke="#999" />
              <Tooltip />
              <Area type="monotone" dataKey="orders" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOrders)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Preferred Varieties */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <h3 className="font-bold text-[#1A1A1A] mb-4">Most Purchased</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={varietyPreferences} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip />
              <Bar dataKey="value" fill="#8B5CF6" radius={[0, 8, 8, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1A1A1A]">Recent Orders</h3>
            <Link href="/buyer/orders" className="text-xs text-[#8B5CF6] font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${o.status === "delivered" ? "bg-[#3FAF5E]/10" : o.status === "in-transit" ? "bg-[#F59E0B]/10" : "bg-[#3B82F6]/10"}`}>
                    <Package className={`w-4 h-4 ${o.status === "delivered" ? "text-[#3FAF5E]" : o.status === "in-transit" ? "text-[#F59E0B]" : "text-[#3B82F6]"}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1A1A1A]">{o.variety}</div>
                    <div className="text-xs text-muted-foreground">{o.quantity} · {o.price}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize
                    ${o.status === "delivered" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : o.status === "in-transit" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-[#3B82F6]/10 text-[#3B82F6]"}`}>
                    {o.status}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">{o.date}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Browse Market", href: "/buyer/marketplace", emoji: "🛒" },
          { label: "My Orders", href: "/buyer/orders", emoji: "📋" },
          { label: "Track Delivery", href: "/tracking", emoji: "📍" },
          { label: "Account Setup", href: "/buyer/setup", emoji: "⚙️" },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 cursor-pointer text-center hover:border-[#8B5CF6]/30 transition-all"
            >
              <span className="text-2xl mb-2 block">{action.emoji}</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{action.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Truck, Package, MapPin, Clock, ArrowUpRight, ArrowDownRight, Navigation } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Link } from "wouter";

const deliveryData = [
  { month: "Jan", deliveries: 45 }, { month: "Feb", deliveries: 62 }, { month: "Mar", deliveries: 78 },
  { month: "Apr", deliveries: 95 }, { month: "May", deliveries: 88 }, { month: "Jun", deliveries: 110 },
  { month: "Jul", deliveries: 125 },
];

const routeData = [
  { route: "Punjab→Delhi", trips: 38 }, { route: "UP→Mumbai", trips: 28 }, { route: "Gujarat→Pune", trips: 22 },
  { route: "MP→Hyderabad", trips: 18 },
];

const activeDeliveries = [
  { id: "DL-1201", origin: "Amritsar, Punjab", destination: "Delhi NCR", status: "in-transit", eta: "4 hours", progress: 65 },
  { id: "DL-1200", origin: "Lucknow, UP", destination: "Mumbai, MH", status: "in-transit", eta: "12 hours", progress: 30 },
  { id: "DL-1199", origin: "Ahmedabad, GJ", destination: "Pune, MH", status: "loading", eta: "Tomorrow", progress: 10 },
  { id: "DL-1198", origin: "Bhopal, MP", destination: "Hyderabad, TS", status: "delivered", eta: "Completed", progress: 100 },
];

const metrics = [
  { label: "Active Deliveries", value: "24", change: "+6", positive: true, icon: Truck, gradient: "from-[#F59E0B] to-[#FBBF24]" },
  { label: "Total Shipments", value: "603", change: "+18.3%", positive: true, icon: Package, gradient: "from-[#3FAF5E] to-[#8FD14F]" },
  { label: "Avg Delivery Time", value: "8.5h", change: "-12%", positive: true, icon: Clock, gradient: "from-[#3B82F6] to-[#60A5FA]" },
  { label: "Coverage Areas", value: "12", change: "+2", positive: true, icon: MapPin, gradient: "from-[#8B5CF6] to-[#A78BFA]" },
];

export default function LogisticsDashboard() {
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
        {/* Active Deliveries Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-[20px] p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/80">Fleet Status</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Live</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "On Route", count: 14, total: 24 },
              { label: "Loading", count: 6, total: 24 },
              { label: "At Destination", count: 4, total: 24 },
            ].map((s) => (
              <div key={s.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{s.label}</span>
                  <span className="font-bold">{s.count}/{s.total}</span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full">
                  <div className="h-2.5 bg-white rounded-full" style={{ width: `${(s.count / s.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/20 text-center">
            <div className="text-2xl font-bold">96.4%</div>
            <div className="text-sm text-white/70">On-Time Delivery Rate</div>
          </div>
        </motion.div>

        {/* Delivery Volume Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A]">Delivery Volume</h3>
              <p className="text-xs text-muted-foreground">Monthly deliveries completed</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={deliveryData}>
              <defs>
                <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#999" />
              <YAxis tick={{ fontSize: 12 }} stroke="#999" />
              <Tooltip />
              <Area type="monotone" dataKey="deliveries" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDeliveries)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Route Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <h3 className="font-bold text-[#1A1A1A] mb-4">Top Routes</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={routeData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="route" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="trips" fill="#F59E0B" radius={[0, 8, 8, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Active Deliveries List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1A1A1A]">Active Deliveries</h3>
            <Link href="/logistics/deliveries" className="text-xs text-[#F59E0B] font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {activeDeliveries.map((d) => (
              <div key={d.id} className="py-2.5 border-b border-border/30 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${d.status === "delivered" ? "bg-[#3FAF5E]/10" : d.status === "in-transit" ? "bg-[#F59E0B]/10" : "bg-[#3B82F6]/10"}`}>
                      {d.status === "delivered" ? <Package className="w-4 h-4 text-[#3FAF5E]" /> : <Truck className="w-4 h-4 text-[#F59E0B]" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1A1A1A]">{d.id}</div>
                      <div className="text-xs text-muted-foreground">{d.origin} → {d.destination}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize
                      ${d.status === "delivered" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : d.status === "in-transit" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-[#3B82F6]/10 text-[#3B82F6]"}`}>
                      {d.status}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">ETA: {d.eta}</div>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className={`h-1.5 rounded-full transition-all ${d.status === "delivered" ? "bg-[#3FAF5E]" : "bg-[#F59E0B]"}`} style={{ width: `${d.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "All Deliveries", href: "/logistics/deliveries", emoji: "🚚" },
          { label: "Track Shipment", href: "/logistics/tracking", emoji: "📍" },
          { label: "Update Location", href: "/logistics/update-location", emoji: "🗺️" },
          { label: "Partner Setup", href: "/logistics/setup", emoji: "⚙️" },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 cursor-pointer text-center hover:border-[#F59E0B]/30 transition-all"
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

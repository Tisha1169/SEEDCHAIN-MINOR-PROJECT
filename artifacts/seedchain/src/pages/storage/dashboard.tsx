import { motion } from "framer-motion";
import { Warehouse, Package, ThermometerSun, AlertTriangle, ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Link } from "wouter";

const capacityData = [
  { month: "Jan", used: 60 }, { month: "Feb", used: 65 }, { month: "Mar", used: 72 },
  { month: "Apr", used: 68 }, { month: "May", used: 78 }, { month: "Jun", used: 82 },
  { month: "Jul", used: 75 },
];

const inventoryByVariety = [
  { name: "Jyoti", value: 4200 }, { name: "Pukhraj", value: 3100 }, { name: "Badshah", value: 2400 },
  { name: "Chipsona", value: 1800 },
];

const recentInbound = [
  { id: "BT-4521", farmer: "Rajesh Kumar", variety: "Kufri Jyoti", quantity: "2,500 kg", grade: "A", date: "2 hours ago" },
  { id: "BT-4520", farmer: "Suresh Patel", variety: "Kufri Pukhraj", quantity: "1,800 kg", grade: "A", date: "5 hours ago" },
  { id: "BT-4519", farmer: "Anita Devi", variety: "Kufri Badshah", quantity: "3,200 kg", grade: "B", date: "1 day ago" },
  { id: "BT-4518", farmer: "Mohan Singh", variety: "Kufri Jyoti", quantity: "1,500 kg", grade: "A", date: "2 days ago" },
];

const metrics = [
  { label: "Total Capacity", value: "50t", change: "75% used", positive: true, icon: Warehouse, gradient: "from-[#3B82F6] to-[#60A5FA]" },
  { label: "Active Batches", value: "148", change: "+12", positive: true, icon: Package, gradient: "from-[#3FAF5E] to-[#8FD14F]" },
  { label: "Avg Temperature", value: "4.2°C", change: "Optimal", positive: true, icon: ThermometerSun, gradient: "from-[#F59E0B] to-[#FBBF24]" },
  { label: "Alerts", value: "2", change: "Action needed", positive: false, icon: AlertTriangle, gradient: "from-[#EF4444] to-[#F87171]" },
];

export default function StorageDashboard() {
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
              <div className={`flex items-center gap-1 text-xs font-semibold ${m.positive ? "text-[#3FAF5E]" : "text-red-500"}`}>
                {m.positive ? <ArrowUpRight className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
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
        {/* Storage Zones Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] rounded-[20px] p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/80">Storage Zones</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Live</span>
          </div>
          <div className="space-y-4">
            {[
              { zone: "Cold Storage A", capacity: 85, temp: "2°C" },
              { zone: "Cold Storage B", capacity: 62, temp: "4°C" },
              { zone: "Ambient Zone", capacity: 78, temp: "18°C" },
            ].map((z) => (
              <div key={z.zone} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{z.zone}</span>
                  <span className="text-white/70">{z.temp} · {z.capacity}%</span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full">
                  <div className={`h-2.5 rounded-full transition-all ${z.capacity > 80 ? "bg-yellow-300" : "bg-white"}`} style={{ width: `${z.capacity}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/20 flex justify-between">
            <div><div className="text-xl font-bold">37.5t</div><div className="text-xs text-white/70">Currently Stored</div></div>
            <div className="text-right"><div className="text-xl font-bold">50t</div><div className="text-xs text-white/70">Total Capacity</div></div>
          </div>
        </motion.div>

        {/* Capacity Utilization Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A]">Capacity Utilization</h3>
              <p className="text-xs text-muted-foreground">Percentage used over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={capacityData}>
              <defs>
                <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#999" />
              <YAxis tick={{ fontSize: 12 }} stroke="#999" unit="%" />
              <Tooltip />
              <Area type="monotone" dataKey="used" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUsed)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Inventory by Variety */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <h3 className="font-bold text-[#1A1A1A] mb-4">Inventory by Variety</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={inventoryByVariety} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Inbound Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1A1A1A]">Recent Inbound</h3>
            <Link href="/storage/incoming" className="text-xs text-[#3B82F6] font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {recentInbound.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1A1A1A]">{a.farmer}</div>
                    <div className="text-xs text-muted-foreground">{a.variety} · {a.quantity}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.grade === "A" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "bg-yellow-100 text-yellow-700"}`}>
                    Grade {a.grade}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">{a.date}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "View Inventory", href: "/storage/inventory", emoji: "📦" },
          { label: "Incoming Batches", href: "/storage/incoming", emoji: "📥" },
          { label: "Outgoing Batches", href: "/storage/outgoing", emoji: "📤" },
          { label: "Facility Setup", href: "/storage/setup", emoji: "⚙️" },
        ].map((action) => (
          <Link key={action.label} href={action.href}>
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 cursor-pointer text-center hover:border-[#3B82F6]/30 transition-all"
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

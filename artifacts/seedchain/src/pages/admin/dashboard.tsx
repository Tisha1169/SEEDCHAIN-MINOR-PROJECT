import { motion } from "framer-motion";
import { Users, Sprout, Warehouse, ShoppingCart, ArrowUpRight, ArrowDownRight, Activity, Shield } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Link } from "wouter";

const platformData = [
  { month: "Jan", users: 120, batches: 340 },
  { month: "Feb", users: 180, batches: 520 },
  { month: "Mar", users: 240, batches: 780 },
  { month: "Apr", users: 320, batches: 1100 },
  { month: "May", users: 410, batches: 1400 },
  { month: "Jun", users: 510, batches: 1800 },
  { month: "Jul", users: 620, batches: 2200 },
];

const roleDistribution = [
  { name: "Farmers", value: 340, color: "#3FAF5E" },
  { name: "Storage", value: 85, color: "#3B82F6" },
  { name: "Logistics", value: 120, color: "#F59E0B" },
  { name: "Buyers", value: 195, color: "#8B5CF6" },
];

const regionData = [
  { region: "Punjab", batches: 480 },
  { region: "UP", batches: 390 },
  { region: "Gujarat", batches: 320 },
  { region: "MP", batches: 260 },
  { region: "Bihar", batches: 210 },
];

const recentUsers = [
  { name: "Rajesh Kumar", role: "farmer", email: "rajesh@farm.com", status: "active", joined: "2 hours ago" },
  { name: "Priya Storage Co.", role: "storage", email: "priya@store.com", status: "active", joined: "5 hours ago" },
  { name: "FastTrack Logistics", role: "logistics", email: "fast@track.com", status: "pending", joined: "1 day ago" },
  { name: "GreenMart Exports", role: "buyer", email: "green@mart.com", status: "active", joined: "2 days ago" },
];

const metrics = [
  { label: "Total Users", value: "740", change: "+12.4%", positive: true, icon: Users, gradient: "from-[#3FAF5E] to-[#8FD14F]" },
  { label: "Active Batches", value: "2,240", change: "+28.6%", positive: true, icon: Sprout, gradient: "from-[#3B82F6] to-[#60A5FA]" },
  { label: "Storage Facilities", value: "85", change: "+5", positive: true, icon: Warehouse, gradient: "from-[#F59E0B] to-[#FBBF24]" },
  { label: "Marketplace Orders", value: "1,120", change: "+32.1%", positive: true, icon: ShoppingCart, gradient: "from-[#8B5CF6] to-[#A78BFA]" },
];

export default function AdminDashboard() {
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
                {m.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
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
        {/* Platform Health Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] rounded-[20px] p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-white/80">Platform Health</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Live</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-white/80" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>API Uptime</span>
                  <span className="font-bold">99.9%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full">
                  <div className="h-2 bg-white rounded-full" style={{ width: "99.9%" }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-white/80" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Verification Rate</span>
                  <span className="font-bold">94.2%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full">
                  <div className="h-2 bg-white rounded-full" style={{ width: "94.2%" }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Sprout className="w-5 h-5 text-white/80" />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Batch Traceability</span>
                  <span className="font-bold">100%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full">
                  <div className="h-2 bg-white rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/20 text-center">
            <div className="text-2xl font-bold">740</div>
            <div className="text-sm text-white/70">Active Users Today</div>
          </div>
        </motion.div>

        {/* Platform Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A]">Platform Growth</h3>
              <p className="text-xs text-muted-foreground">Users &amp; batches over time</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3FAF5E]" /> Users</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Batches</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={platformData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3FAF5E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3FAF5E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBatches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#999" />
              <YAxis tick={{ fontSize: 12 }} stroke="#999" />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#3FAF5E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUsers)" />
              <Area type="monotone" dataKey="batches" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBatches)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Role Distribution (Pie) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <h3 className="font-bold text-[#1A1A1A] mb-2">User Distribution</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {roleDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {roleDistribution.map((r) => (
              <div key={r.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-muted-foreground">{r.name}</span>
                <span className="font-semibold ml-auto">{r.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Regions Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <h3 className="font-bold text-[#1A1A1A] mb-4">Top Regions</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="region" type="category" tick={{ fontSize: 12 }} width={55} />
              <Tooltip />
              <Bar dataKey="batches" fill="#3FAF5E" radius={[0, 8, 8, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-[20px] p-6 shadow-sm border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1A1A1A]">Recent Users</h3>
            <Link href="/admin/users" className="text-xs text-[#3B82F6] font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u.email} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-bold">
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1A1A1A] truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{u.role} · {u.joined}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.status === "active" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "bg-yellow-100 text-yellow-700"}`}>
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

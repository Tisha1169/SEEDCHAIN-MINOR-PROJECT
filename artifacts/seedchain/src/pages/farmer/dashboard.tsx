import { motion } from "framer-motion";
import { Sprout, Package, Warehouse, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "wouter";
import { dummyBatches, batchQRData } from "@/lib/supply-chain";

const harvestData = [
  { month: "Jan", qty: 1200 }, { month: "Feb", qty: 1800 }, { month: "Mar", qty: 2400 },
  { month: "Apr", qty: 3200 }, { month: "May", qty: 2800 }, { month: "Jun", qty: 3600 },
  { month: "Jul", qty: 4100 },
];

const batchData = [
  { name: "Jyoti", value: 35 }, { name: "Pukhraj", value: 28 }, { name: "Badshah", value: 20 },
  { name: "Chipsona", value: 17 },
];

const metrics = [
  { label: "Active Crops", value: "12", change: "+3", positive: true, icon: Sprout, gradient: "from-[#3FAF5E] to-[#8FD14F]" },
  { label: "Total Harvest", value: "18.4t", change: "+18.7%", positive: true, icon: Package, gradient: "from-[#3B82F6] to-[#60A5FA]" },
  { label: "In Storage", value: "8.2t", change: "-2.1%", positive: false, icon: Warehouse, gradient: "from-[#F59E0B] to-[#FBBF24]" },
  { label: "Revenue", value: "₹4.2L", change: "+24.5%", positive: true, icon: TrendingUp, gradient: "from-[#8B5CF6] to-[#A78BFA]" },
];

export default function FarmerDashboard() {
  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8E6E1]/60 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-sm`}>
                <m.icon className="w-5 h-5 text-white" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${m.positive ? "text-[#3FAF5E]" : "text-red-500"}`}>
                {m.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {m.change}
              </div>
            </div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{m.value}</div>
            <div className="text-xs text-[#1A1A1A]/40 mt-0.5">{m.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Gauge card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-gradient-to-br from-[#3FAF5E] to-[#2D8A45] rounded-[24px] p-6 text-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-white/70">Storage Capacity</span>
            <span className="text-[10px] bg-white/15 px-2.5 py-1 rounded-full">This Month</span>
          </div>
          <div className="relative w-36 h-36 mx-auto mb-4">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${0.45 * 314} ${314}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">45%</span>
              <span className="text-xs text-white/60">Used</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">8,200 kg</div>
            <div className="text-sm text-white/60">of 18,400 kg capacity</div>
          </div>
        </motion.div>

        {/* Harvest volume */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#1A1A1A]">Harvest Volume</h3>
              <p className="text-xs text-[#1A1A1A]/40">Last 7 months trend</p>
            </div>
            <div className="flex gap-1.5">
              {["7D", "1M", "6M"].map((p) => (
                <button key={p} className={`text-[11px] px-3 py-1.5 rounded-xl font-medium ${p === "6M" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "text-[#1A1A1A]/35 hover:bg-[#F4F4F4]"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={harvestData}>
              <defs>
                <linearGradient id="fHarvest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3FAF5E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3FAF5E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fontSize: 11 }} stroke="#ccc" />
              <Tooltip />
              <Area type="monotone" dataKey="qty" stroke="#3FAF5E" strokeWidth={2.5} fillOpacity={1} fill="url(#fHarvest)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Batches with QR codes */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-[#1A1A1A]">My Batches</h3>
          <Link href="/farmer/batches" className="text-xs text-[#3FAF5E] font-medium hover:underline">View All</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dummyBatches.map((b) => (
            <motion.div key={b.batchId} whileHover={{ y: -3 }}
              className="rounded-[20px] border border-[#E8E6E1]/60 p-4 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono text-[#1A1A1A]/35 block">{b.batchId}</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">{b.variety}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${b.grade === "A" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "bg-[#F59E0B]/10 text-[#F59E0B]"}`}>
                  Grade {b.grade}
                </span>
              </div>
              <div className="flex items-center justify-center bg-[#F7F7F7] rounded-2xl p-3 mb-3">
                <QRCodeSVG value={batchQRData(b)} size={80} level="M" bgColor="#F7F7F7" fgColor="#1A1A1A" />
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Quantity</span><span className="font-medium text-[#1A1A1A]">{b.quantity}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">Harvest</span><span className="font-medium text-[#1A1A1A]">{b.harvestDate}</span></div>
                <div className="flex justify-between"><span className="text-[#1A1A1A]/40">RFID</span><span className="font-mono text-[#1A1A1A]/50 text-[10px]">{b.rfidTag}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom: Varieties chart + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
          <h3 className="font-bold text-[#1A1A1A] mb-4">Batch Varieties</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={batchData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
              <Bar dataKey="value" fill="#3FAF5E" radius={[0, 10, 10, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3 content-start">
          {[
            { label: "Register Crop", href: "/farmer/register-crop", emoji: "🌱" },
            { label: "Record Harvest", href: "/farmer/record-harvest", emoji: "🌾" },
            { label: "Send to Storage", href: "/farmer/send-to-storage", emoji: "📦" },
            { label: "List on Market", href: "/farmer/marketplace", emoji: "🛒" },
          ].map((a) => (
            <Link key={a.label} href={a.href}>
              <motion.div whileHover={{ y: -3 }}
                className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E8E6E1]/60 text-center hover:border-[#3FAF5E]/30 transition-all cursor-pointer h-full flex flex-col items-center justify-center">
                <span className="text-2xl mb-2 block">{a.emoji}</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{a.label}</span>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

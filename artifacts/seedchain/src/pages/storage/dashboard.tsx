import { motion } from "framer-motion";
import { Warehouse, Package, Thermometer, TrendingUp, ArrowUpRight } from "lucide-react";
import { storageInventory } from "@/lib/supply-chain";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const flowData = [
  { day: "Mon", in: 800, out: 400 }, { day: "Tue", in: 1200, out: 600 }, { day: "Wed", in: 600, out: 900 },
  { day: "Thu", in: 1500, out: 700 }, { day: "Fri", in: 900, out: 1100 }, { day: "Sat", in: 400, out: 300 },
];

const stored = storageInventory.filter(s => s.status === "stored");
const totalKg = storageInventory.reduce((a, s) => a + s.quantityKg, 0);

const metrics = [
  { label: "Total Stored", value: `${(totalKg / 1000).toFixed(1)}t`, change: "+12%", gradient: "from-[#3FAF5E] to-[#8FD14F]", icon: Warehouse },
  { label: "Active Batches", value: String(stored.length), change: "+2", gradient: "from-[#3B82F6] to-[#60A5FA]", icon: Package },
  { label: "Avg Temp", value: "3.8°C", change: "Optimal", gradient: "from-[#8B5CF6] to-[#A78BFA]", icon: Thermometer },
  { label: "Throughput", value: "98%", change: "+3%", gradient: "from-[#F59E0B] to-[#FBBF24]", icon: TrendingUp },
];

export default function StorageDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8E6E1]/60">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center`}>
                <m.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-[#3FAF5E] flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />{m.change}</span>
            </div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{m.value}</div>
            <div className="text-xs text-[#1A1A1A]/40">{m.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Capacity gauge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-[24px] p-6 text-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-white/70">Chamber Capacity</span>
            <span className="text-[10px] bg-white/15 px-2.5 py-1 rounded-full">Live</span>
          </div>
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${0.67 * 314} ${314}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">67%</span>
              <span className="text-xs text-white/60">Used</span>
            </div>
          </div>
          <div className="text-center text-sm text-white/60">{totalKg.toLocaleString()} / 16,000 kg</div>
        </motion.div>

        {/* Flow chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
          <h3 className="font-bold text-[#1A1A1A] mb-1">Weekly Flow</h3>
          <p className="text-xs text-[#1A1A1A]/40 mb-4">Incoming vs Outgoing (kg)</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={flowData}>
              <defs>
                <linearGradient id="sIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3FAF5E" stopOpacity={0.3}/><stop offset="95%" stopColor="#3FAF5E" stopOpacity={0}/></linearGradient>
                <linearGradient id="sOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fontSize: 11 }} stroke="#ccc" />
              <Tooltip />
              <Area type="monotone" dataKey="in" stroke="#3FAF5E" strokeWidth={2} fill="url(#sIn)" name="Incoming" />
              <Area type="monotone" dataKey="out" stroke="#3B82F6" strokeWidth={2} fill="url(#sOut)" name="Outgoing" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Batches table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <h3 className="font-bold text-[#1A1A1A] mb-4">Stored Batches</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E1]/60">
                {["Batch ID", "Variety", "Farmer", "Qty (kg)", "Temp", "Chamber", "Status"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-[#1A1A1A]/40 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {storageInventory.map((s) => (
                <tr key={s.id} className="border-b border-[#E8E6E1]/30 hover:bg-[#F7F7F7] transition-colors">
                  <td className="py-3 pr-4 font-mono text-xs text-[#1A1A1A]/60">{s.batchId}</td>
                  <td className="py-3 pr-4 font-semibold">{s.variety}</td>
                  <td className="py-3 pr-4 text-[#1A1A1A]/60">{s.farmerName}</td>
                  <td className="py-3 pr-4 font-semibold">{s.quantityKg.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-[#3B82F6] font-medium">{s.temperatureC}°C</td>
                  <td className="py-3 pr-4 text-[#1A1A1A]/60">{s.chamber}</td>
                  <td className="py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.status === "stored" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : s.status === "released" ? "bg-gray-100 text-gray-500" : "bg-[#F59E0B]/10 text-[#F59E0B]"}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

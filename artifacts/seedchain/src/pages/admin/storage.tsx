import { motion } from "framer-motion";
import { Warehouse, Thermometer, Droplets, Box } from "lucide-react";
import { storageInventory, pendingIncoming } from "@/lib/supply-chain";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const capacityData = [
  { name: "Cold A", used: 75, total: 100 },
  { name: "Cold B", used: 45, total: 80 },
  { name: "Dry Store", used: 60, total: 120 },
  { name: "Pack Zone", used: 30, total: 50 },
];

export default function AdminStorage() {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Active Facilities", value: "4", icon: Warehouse, color: "#3B82F6" },
          { label: "Avg Temperature", value: "3.2°C", icon: Thermometer, color: "#3FAF5E" },
          { label: "Items Stored", value: String(storageInventory.length), icon: Box, color: "#8B5CF6" },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8E6E1]/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${m.color}15` }}>
                <m.icon className="w-5 h-5" style={{ color: m.color }} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#1A1A1A]">{m.value}</div>
                <div className="text-[10px] text-[#1A1A1A]/40">{m.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <h3 className="font-bold text-[#1A1A1A] mb-4">Capacity Usage</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={capacityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#ccc" />
            <YAxis tick={{ fontSize: 11 }} stroke="#ccc" />
            <Tooltip />
            <Bar dataKey="used" fill="#3FAF5E" radius={[8, 8, 0, 0]} />
            <Bar dataKey="total" fill="#E8E6E1" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <h3 className="font-bold text-[#1A1A1A] mb-4">Current Inventory</h3>
        <div className="space-y-3">
          {storageInventory.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-[14px] border border-[#E8E6E1]/40">
              <div>
                <div className="text-sm font-medium text-[#1A1A1A]">{item.variety}</div>
                <div className="text-[10px] text-[#1A1A1A]/40 font-mono">{item.batchId} • Chamber: {item.chamber}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#1A1A1A]">{item.quantityKg.toLocaleString()}kg</div>
                <div className="text-[10px] text-[#1A1A1A]/40">{item.temperatureC}°C / {item.humidityPct}%</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

import { motion } from "framer-motion";
import { TrendingUp, Map, Leaf, ArrowRight, Package, Truck, Warehouse as WarehouseIcon, ShoppingCart } from "lucide-react";
import { Sankey, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { useListBatches } from "@lib/api-client-react";

const stageFlow = [
  { stage: "Farm", count: 24, icon: Leaf, color: "#3FAF5E" },
  { stage: "Storage", count: 4, icon: WarehouseIcon, color: "#3B82F6" },
  { stage: "Transit", count: 8, icon: Truck, color: "#F59E0B" },
  { stage: "Buyer", count: 6, icon: ShoppingCart, color: "#8B5CF6" },
];

const throughputData = [
  { week: "W1", batches: 4 }, { week: "W2", batches: 7 }, { week: "W3", batches: 5 },
  { week: "W4", batches: 9 }, { week: "W5", batches: 12 }, { week: "W6", batches: 8 },
];

const allShipments = [
  { trackingId: "SHIP-001", status: "delivered", origin: { name: "Punjab Farm" }, destination: { name: "Delhi Storage" }, events: [{completed: true}, {completed: true}, {completed: true}] },
  { trackingId: "SHIP-002", status: "in-transit", origin: { name: "Haryana Farm" }, destination: { name: "Mumbai Buyer" }, events: [{completed: true}, {completed: true}] },
  { trackingId: "SHIP-003", status: "in-storage", origin: { name: "Gujarat Farm" }, destination: { name: "Bangalore Market" }, events: [{completed: true}, {completed: false}] },
];

export default function AdminSupplyChainMap() {
  const { data: batches = [] } = useListBatches();

  return (
    <div className="space-y-5">
      {/* Pipeline visualization */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <div className="flex items-center gap-2 mb-5">
          <Map className="w-5 h-5 text-[#3FAF5E]" />
          <h2 className="text-lg font-bold text-[#1A1A1A]">Supply Chain Pipeline</h2>
        </div>
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {stageFlow.map((s, i) => (
            <div key={s.stage} className="flex items-center">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.12 }}
                className="flex flex-col items-center min-w-[100px]">
                <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-2" style={{ backgroundColor: `${s.color}15` }}>
                  <s.icon className="w-7 h-7" style={{ color: s.color }} />
                </div>
                <span className="text-sm font-bold text-[#1A1A1A]">{s.count}</span>
                <span className="text-[10px] text-[#1A1A1A]/40">{s.stage}</span>
              </motion.div>
              {i < stageFlow.length - 1 && (
                <ArrowRight className="w-5 h-5 text-[#E8E6E1] mx-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Throughput chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
          <h3 className="font-bold text-[#1A1A1A] mb-4">Weekly Throughput</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#ccc" />
              <YAxis tick={{ fontSize: 11 }} stroke="#ccc" />
              <Tooltip />
              <Line type="monotone" dataKey="batches" stroke="#3FAF5E" strokeWidth={2.5} dot={{ r: 4, fill: "#3FAF5E" }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Active routes */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
          <h3 className="font-bold text-[#1A1A1A] mb-4">Active Routes</h3>
          <div className="space-y-3">
            {allShipments.map((s, i) => (
              <motion.div key={s.trackingId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.08 }}
                className="p-3 rounded-[14px] border border-[#E8E6E1]/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-semibold text-[#1A1A1A]">{s.trackingId}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.status === "in-transit" ? "bg-[#F59E0B]/10 text-[#F59E0B]" : s.status === "delivered" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "bg-[#3B82F6]/10 text-[#3B82F6]"}`}>
                    {s.status.replace("-", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#1A1A1A]/40">
                  <span>{s.origin.name}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{s.destination.name}</span>
                </div>
                <div className="mt-2 h-1.5 bg-[#F7F7F7] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round((s.events.filter(e => e.completed).length / s.events.length) * 100)}%` }} transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                    className="h-full rounded-full bg-gradient-to-r from-[#3FAF5E] to-[#8FD14F]" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Batch journey summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <h3 className="font-bold text-[#1A1A1A] mb-4">Batch Journey Overview</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {batches.slice(0, 4).map((b: any, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.06 }}
              className="p-4 rounded-[18px] border border-[#E8E6E1]/40 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-[#3FAF5E]" />
                <span className="font-mono text-xs font-semibold">{b.batchCode}</span>
              </div>
              <div className="text-xs text-[#1A1A1A]/50 space-y-1">
                <div>{b.variety} · {b.quantityKg}kg</div>
                <div>Planted: {b.plantingDate?.split("T")[0]}</div>
                <div className="font-semibold text-[#1A1A1A] capitalize">Status: {b.status.replace(/_/g, " ")}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

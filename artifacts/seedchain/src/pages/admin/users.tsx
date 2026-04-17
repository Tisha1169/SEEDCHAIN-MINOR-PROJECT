import { motion, AnimatePresence } from "framer-motion";
import { Search, Shield, User as UserIcon, MoreVertical, ChevronDown } from "lucide-react";
import { useState } from "react";

interface UserRow { id: string; name: string; email: string; role: string; status: "active" | "suspended"; joined: string }

const users: UserRow[] = [
  { id: "U001", name: "Rajesh Kumar", email: "rajesh@farmer.com", role: "farmer", status: "active", joined: "2024-12-01" },
  { id: "U002", name: "CoolStore Admin", email: "storage@coolstore.com", role: "storage", status: "active", joined: "2024-11-15" },
  { id: "U003", name: "FastTrack Logistics", email: "logistics@fasttrack.com", role: "logistics", status: "active", joined: "2024-10-20" },
  { id: "U004", name: "GreenMart Buyer", email: "buyer@greenmart.com", role: "buyer", status: "active", joined: "2024-11-28" },
  { id: "U005", name: "Meena Patel", email: "meena@farmer.com", role: "farmer", status: "active", joined: "2025-01-05" },
  { id: "U006", name: "Old Warehouse", email: "old@warehouse.com", role: "storage", status: "suspended", joined: "2024-06-10" },
];

const roleBadge: Record<string, string> = {
  farmer: "bg-[#3FAF5E]/10 text-[#3FAF5E]",
  storage: "bg-[#3B82F6]/10 text-[#3B82F6]",
  logistics: "bg-[#F59E0B]/10 text-[#F59E0B]",
  buyer: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  admin: "bg-[#EF4444]/10 text-[#EF4444]",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const filtered = users.filter(u =>
    (roleFilter === "all" || u.role === roleFilter) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E6E1]/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">User Management</h2>
            <p className="text-xs text-[#1A1A1A]/40">{users.length} registered users</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#F7F7F7] rounded-xl px-3 py-2 gap-2 text-sm">
              <Search className="w-4 h-4 text-[#1A1A1A]/30" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="bg-transparent outline-none w-40 text-sm placeholder:text-[#1A1A1A]/30" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="bg-[#F7F7F7] rounded-xl px-3 py-2 text-sm text-[#1A1A1A] border-0 outline-none">
              <option value="all">All Roles</option>
              <option value="farmer">Farmer</option>
              <option value="storage">Storage</option>
              <option value="logistics">Logistics</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#1A1A1A]/40 text-xs">
                <th className="text-left pb-3 font-medium">User</th>
                <th className="text-left pb-3 font-medium">Role</th>
                <th className="text-left pb-3 font-medium">Status</th>
                <th className="text-left pb-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((u, i) => (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-t border-[#E8E6E1]/40 hover:bg-[#F7F7F7]/50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3FAF5E]/20 to-[#8FD14F]/20 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-[#3FAF5E]" />
                        </div>
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{u.name}</div>
                          <div className="text-[10px] text-[#1A1A1A]/40">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full capitalize ${roleBadge[u.role] || ""}`}>{u.role}</span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${u.status === "active" ? "bg-[#3FAF5E]/10 text-[#3FAF5E]" : "bg-red-100 text-red-500"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-[#1A1A1A]/50">{new Date(u.joined).toLocaleDateString()}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

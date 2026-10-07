import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListUsers, type CurrentUser } from "@workspace/api-client-react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState, Loading, PageHeader, Pill, Table, textareaCls } from "@/components/app/common";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, errMsg } from "@/lib/api";
import { dateOnly, titleCase } from "@/lib/format";

const STATUS: Record<string, string> = { pending: "bg-amber-400/15 text-amber-300", active: "bg-emerald-400/15 text-emerald-300", rejected: "bg-rose-400/15 text-rose-300", suspended: "bg-zinc-400/15 text-zinc-300" };

export default function AdminUsers() {
  const [role, setRole] = useState("");
  const q = useListUsers(role ? { role: role as never } : undefined);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [target, setTarget] = useState<{ u: CurrentUser; action: "approve" | "reject" | "suspend" | "reactivate" } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!target) return;
    setBusy(true);
    try {
      await apiRequest({ url: `/api/admin/users/${target.u.id}/${target.action}`, method: "POST", body: note ? { note } : {} });
      toast({ title: `${titleCase(target.action)} done` });
      setTarget(null); setNote("");
      await qc.invalidateQueries();
    } catch (err) { toast({ title: "Failed", description: errMsg(err), variant: "destructive" }); }
    finally { setBusy(false); }
  }
  const btn = (u: CurrentUser, action: "approve" | "reject" | "suspend" | "reactivate", label: string) => <Button key={action} size="sm" variant="outline" className="mr-1 rounded-full" onClick={() => setTarget({ u, action })}>{label}</Button>;

  return (
    <>
      <PageHeader title="Users & farmers" subtitle="Approve farmers before they can create lots and QR codes." actions={<select className="h-10 rounded-full border bg-glass-2 px-4 text-sm" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option><option value="farmer">Farmers</option><option value="customer">Customers</option><option value="admin">Admins</option></select>} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : (
        <Table head={["Name", "Email", "Role", "Status", "Location / public profile", "Joined", ""]}>
          {q.data?.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-medium">{u.name}</td><td className="px-4 py-3">{u.email}</td><td className="px-4 py-3 capitalize">{u.role}</td>
              <td className="px-4 py-3"><Pill className={STATUS[u.status]}>{u.status}</Pill></td>
              <td className="px-4 py-3 text-xs">{u.farmerProfile ? <span className="inline-flex items-center gap-1">{u.farmerProfile.publicName} · {[u.farmerProfile.district, u.farmerProfile.state].filter(Boolean).join(", ")}{u.farmerProfile.verifiedAt && <BadgeCheck className="h-3.5 w-3.5 text-accent" />}</span> : u.location ?? "—"}</td>
              <td className="px-4 py-3 text-xs">{dateOnly(u.createdAt)}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {u.role === "farmer" && u.status !== "active" && u.status !== "suspended" && btn(u, "approve", "Approve")}
                {u.role === "farmer" && u.status === "pending" && btn(u, "reject", "Reject")}
                {u.role !== "admin" && u.status === "active" && btn(u, "suspend", "Suspend")}
                {u.status === "suspended" && btn(u, "reactivate", "Reactivate")}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{target && `${titleCase(target.action)} ${target.u.name}`}</DialogTitle><DialogDescription>Recorded in the audit log.</DialogDescription></DialogHeader>
          <textarea className={textareaCls} rows={3} placeholder={target?.action === "reject" || target?.action === "suspend" ? "Reason (required)" : "Verification note (optional)"} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter><Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button><Button disabled={busy || ((target?.action === "reject" || target?.action === "suspend") && !note.trim())} className="bg-glass-2 text-neutral-950" onClick={() => void run()}>Confirm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

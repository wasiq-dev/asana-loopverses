import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

export default function Clients() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [clients, setClients] = useState<any[]>([]);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", contact_email: "", contact_phone: "", notes: "" });

  const load = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("client_id"),
    ]);
    setClients(c ?? []);
    const counts: Record<string, number> = {};
    (p ?? []).forEach((pr: any) => { if (pr.client_id) counts[pr.client_id] = (counts[pr.client_id] || 0) + 1; });
    setProjectCounts(counts);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const { error } = await supabase.from("clients").insert({ ...form, name: form.name.trim(), created_by: user?.id });
    if (error) return toast.error(error.message);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, entity_type: "client", action: "created", metadata: { name: form.name } });
    toast.success("Client added");
    setOpen(false);
    setForm({ name: "", company: "", contact_email: "", contact_phone: "", notes: "" });
    load();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">Companies you're working with</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground glow-primary border-0"><Plus className="h-4 w-4 mr-2" />New client</Button></DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader><DialogTitle>Add client</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Company</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={create} className="bg-gradient-primary text-primary-foreground border-0">Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map(c => (
          <div key={c.id} className="glass rounded-2xl p-5 hover:shadow-neon transition-all animate-in-up">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-primary/20 flex items-center justify-center text-primary shrink-0"><Building2 className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-semibold text-lg truncate">{c.name}</h3>
                {c.company && <p className="text-sm text-muted-foreground truncate">{c.company}</p>}
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground font-mono">
              {c.contact_email && <p className="flex items-center gap-2 truncate"><Mail className="h-3 w-3 shrink-0" />{c.contact_email}</p>}
              {c.contact_phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.contact_phone}</p>}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Projects</span>
              <span className="font-mono font-semibold text-primary">{projectCounts[c.id] || 0}</span>
            </div>
          </div>
        ))}
        {clients.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No clients yet.</p>}
      </div>
    </div>
  );
}

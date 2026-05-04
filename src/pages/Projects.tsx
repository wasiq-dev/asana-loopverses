import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-muted text-foreground",
  active: "bg-accent/20 text-accent border-accent/30",
  on_hold: "bg-warning/20 text-warning border-warning/30",
  completed: "bg-success/20 text-success border-success/30",
};

export default function Projects() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", client_id: "", team_id: "", status: "planning", due_date: "" });

  const load = async () => {
    const [{ data: p }, { data: c }, { data: t }] = await Promise.all([
      supabase.from("projects").select("*, clients(name), teams(name)").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name"),
      supabase.from("teams").select("id, name"),
    ]);
    setProjects(p ?? []);
    setClients(c ?? []);
    setTeams(t ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("projects").insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      client_id: form.client_id || null,
      team_id: form.team_id || null,
      status: form.status as any,
      due_date: form.due_date || null,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    await supabase.from("activity_logs").insert({ user_id: user?.id, entity_type: "project", action: "created", metadata: { name: form.name } });
    toast.success("Project created");
    setOpen(false);
    setForm({ name: "", description: "", client_id: "", team_id: "", status: "planning", due_date: "" });
    load();
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">All initiatives across the workspace</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground glow-primary border-0"><Plus className="h-4 w-4 mr-2" />New project</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Client</Label>
                    <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Team</Label>
                    <Select value={form.team_id} onValueChange={v => setForm({ ...form, team_id: v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={create} className="bg-gradient-primary text-primary-foreground border-0">Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search projects" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 glass" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="glass rounded-2xl p-5 hover:shadow-neon transition-all duration-300 animate-in-up">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center text-primary"><FolderKanban className="h-5 w-5" /></div>
              <Badge variant="outline" className={STATUS_STYLES[p.status]}>{p.status.replace("_", " ")}</Badge>
            </div>
            <h3 className="font-display font-semibold text-lg">{p.name}</h3>
            {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</p>}
            <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground font-mono">
              {p.clients?.name && <span>{p.clients.name}</span>}
              {p.teams?.name && <span>· {p.teams.name}</span>}
              {p.due_date && <span>· due {format(new Date(p.due_date), "MMM d")}</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No projects yet.</p>}
      </div>
    </div>
  );
}

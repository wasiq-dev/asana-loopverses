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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { useSearchParams } from "react-router-dom";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/20 text-accent border-accent/30",
  high: "bg-warning/20 text-warning border-warning/30",
  urgent: "bg-destructive/20 text-destructive border-destructive/30",
};

const COLUMNS = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

export default function Tasks() {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", project_id: "", assignee_id: "", priority: "medium", due_date: "" });

  const load = async () => {
    const [{ data: t }, { data: p }, { data: pf }] = await Promise.all([
      supabase.from("tasks").select("*, projects(name)").order("created_at", { ascending: false }),
      supabase.from("projects").select("id, name"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);
    setTasks(t ?? []);
    setProjects(p ?? []);
    setProfiles(pf ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      project_id: form.project_id || null,
      assignee_id: form.assignee_id || null,
      priority: form.priority as any,
      due_date: form.due_date || null,
      created_by: user.id,
    });
    if (error) return toast.error(error.message);
    await supabase.from("activity_logs").insert({ user_id: user.id, entity_type: "task", action: "created", metadata: { title: form.title } });
    toast.success("Task created");
    setOpen(false);
    setForm({ title: "", description: "", project_id: "", assignee_id: "", priority: "medium", due_date: "" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    if (user) await supabase.from("activity_logs").insert({ user_id: user.id, entity_type: "task", action: `moved to ${status}`, entity_id: id });
    load();
  };

  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">Kanban view across all projects</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground glow-primary border-0"><Plus className="h-4 w-4 mr-2" />New task</Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Project</Label>
                  <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assignee</Label>
                  <Select value={form.assignee_id} onValueChange={v => setForm({ ...form, assignee_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={create} className="bg-gradient-primary text-primary-foreground border-0">Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tasks" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 glass" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const items = filtered.filter(t => t.status === col.key);
          return (
            <div key={col.key} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-display font-semibold">{col.label}</h3>
                <Badge variant="outline" className="font-mono text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {items.map(t => {
                  const assignee = profileMap[t.assignee_id];
                  const initials = (assignee?.full_name || assignee?.email || "?").slice(0, 2).toUpperCase();
                  const canEdit = role === "admin" || t.assignee_id === user?.id || t.created_by === user?.id;
                  return (
                    <div key={t.id} className="bg-card rounded-xl p-3 border border-border hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium leading-snug">{t.title}</h4>
                        <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</Badge>
                      </div>
                      {t.projects?.name && <p className="text-xs text-muted-foreground mt-1.5 font-mono">{t.projects.name}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          {assignee && (
                            <Avatar className="h-6 w-6 border border-border"><AvatarFallback className="text-[10px] bg-gradient-primary text-primary-foreground">{initials}</AvatarFallback></Avatar>
                          )}
                          {t.due_date && <span className="text-[10px] font-mono text-muted-foreground">{format(new Date(t.due_date), "MMM d")}</span>}
                        </div>
                        {canEdit && (
                          <Select value={t.status} onValueChange={v => updateStatus(t.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To do</SelectItem>
                              <SelectItem value="in_progress">In progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No tasks</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

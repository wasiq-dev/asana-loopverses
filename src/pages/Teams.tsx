import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Users, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Teams() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState("");

  const load = async () => {
    const [{ data: t }, { data: m }, { data: p }] = await Promise.all([
      supabase.from("teams").select("*").order("created_at", { ascending: false }),
      supabase.from("team_members").select("*"),
      supabase.from("profiles").select("id, full_name, email, avatar_url"),
    ]);
    setTeams(t ?? []); setMembers(m ?? []); setProfiles(p ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const { error } = await supabase.from("teams").insert({ name: form.name.trim(), description: form.description || null, created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Team created");
    setOpen(false); setForm({ name: "", description: "" }); load();
  };

  const addMember = async (teamId: string) => {
    if (!selectedUser) return;
    const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: selectedUser });
    if (error) return toast.error(error.message);
    setSelectedUser(""); setAddingTo(null); load();
  };

  const removeMember = async (id: string) => {
    await supabase.from("team_members").delete().eq("id", id);
    load();
  };

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground mt-1">Organize your workforce</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground glow-primary border-0"><Plus className="h-4 w-4 mr-2" />New team</Button></DialogTrigger>
            <DialogContent className="glass-strong">
              <DialogHeader><DialogTitle>Create team</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={create} className="bg-gradient-primary text-primary-foreground border-0">Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map(t => {
          const teamMembers = members.filter(m => m.team_id === t.id);
          return (
            <div key={t.id} className="glass rounded-2xl p-5 animate-in-up">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-primary/20 flex items-center justify-center text-primary"><Users className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-display font-semibold text-lg">{t.name}</h3>
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xs uppercase font-mono text-muted-foreground mb-2">Members ({teamMembers.length})</div>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map(m => {
                    const p = profileMap[m.user_id];
                    const label = p?.full_name || p?.email || "?";
                    return (
                      <div key={m.id} className="flex items-center gap-2 bg-secondary rounded-full pl-1 pr-2 py-1 text-xs">
                        <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-gradient-primary text-primary-foreground">{label.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                        <span>{label}</span>
                        {isAdmin && <button onClick={() => removeMember(m.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>}
                      </div>
                    );
                  })}
                  {teamMembers.length === 0 && <span className="text-xs text-muted-foreground">No members</span>}
                </div>
                {isAdmin && (
                  <div className="mt-3">
                    {addingTo === t.id ? (
                      <div className="flex gap-2">
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Pick a user" /></SelectTrigger>
                          <SelectContent>
                            {profiles.filter(p => !teamMembers.some(m => m.user_id === p.id)).map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => addMember(t.id)}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAddingTo(null); setSelectedUser(""); }}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setAddingTo(t.id)} className="glass"><Plus className="h-3 w-3 mr-1" />Add member</Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {teams.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No teams yet.</p>}
      </div>
    </div>
  );
}

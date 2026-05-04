import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths, startOfMonth } from "date-fns";

export default function Admin() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const load = async () => {
    const [{ data: p }, { data: r }, { data: t }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("user_roles").select("*"),
      supabase.from("tasks").select("assignee_id, status, completed_at, created_at"),
    ]);
    setProfiles(p ?? []); setRoles(r ?? []); setTasks(t ?? []);
  };
  useEffect(() => { load(); }, []);

  const getRole = (uid: string) => roles.find(r => r.user_id === uid)?.role ?? "member";

  const toggleAdmin = async (uid: string) => {
    const isAdmin = getRole(uid) === "admin";
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      if (error) return toast.error(error.message);
      // ensure they have member role
      await supabase.from("user_roles").insert({ user_id: uid, role: "member" }).select();
      toast.success("Removed admin");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Granted admin");
    }
    load();
  };

  // Per-user performance
  const performance = profiles.map(p => {
    const userTasks = tasks.filter(t => t.assignee_id === p.id);
    return {
      ...p,
      total: userTasks.length,
      completed: userTasks.filter(t => t.status === "completed").length,
      inProgress: userTasks.filter(t => t.status === "in_progress").length,
    };
  }).sort((a, b) => b.completed - a.completed);

  // Monthly company-wide completion
  const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
  const monthly = months.map(m => {
    const key = format(m, "yyyy-MM");
    return {
      month: format(m, "MMM"),
      completed: tasks.filter(t => t.completed_at?.startsWith(key)).length,
      created: tasks.filter(t => t.created_at?.startsWith(key)).length,
    };
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">Manage members and monitor performance</p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="glass">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Joined</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map(p => {
                  const r = getRole(p.id);
                  const initials = (p.full_name || p.email || "?").slice(0, 2).toUpperCase();
                  return (
                    <tr key={p.id} className="hover:bg-secondary/20">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border"><AvatarImage src={p.avatar_url} /><AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">{initials}</AvatarFallback></Avatar>
                          <div>
                            <div className="font-medium text-sm">{p.full_name || "—"}</div>
                            {p.job_title && <div className="text-xs text-muted-foreground">{p.job_title}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-mono text-muted-foreground">{p.email}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={r === "admin" ? "bg-primary/20 text-primary border-primary/30" : ""}>{r}</Badge>
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                      <td className="p-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => toggleAdmin(p.id)} className="glass">
                          {r === "admin" ? <><ShieldOff className="h-3 w-3 mr-1" />Demote</> : <><Shield className="h-3 w-3 mr-1" />Promote</>}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {performance.map(p => {
              const rate = p.total ? Math.round((p.completed / p.total) * 100) : 0;
              return (
                <div key={p.id} className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10"><AvatarImage src={p.avatar_url} /><AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">{(p.full_name || p.email || "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{p.full_name || p.email}</div>
                      <div className="text-xs text-muted-foreground font-mono">{rate}% completion rate</div>
                    </div>
                    <span className="font-display text-2xl font-bold text-gradient">{p.completed}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-secondary/50 rounded-lg p-2"><div className="font-mono text-muted-foreground">Total</div><div className="font-bold mt-0.5">{p.total}</div></div>
                    <div className="bg-accent/10 rounded-lg p-2"><div className="font-mono text-muted-foreground">Active</div><div className="font-bold mt-0.5 text-accent">{p.inProgress}</div></div>
                    <div className="bg-success/10 rounded-lg p-2"><div className="font-mono text-muted-foreground">Done</div><div className="font-bold mt-0.5 text-success">{p.completed}</div></div>
                  </div>
                  <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary transition-all" style={{ width: `${rate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="company" className="mt-6">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Last 6 months</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="created" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Created" />
                <Bar dataKey="completed" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

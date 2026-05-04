import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { CheckSquare, FolderKanban, Users, Building2, TrendingUp, Activity as ActivityIcon } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfMonth } from "date-fns";

interface Stats {
  projects: number;
  tasks: number;
  completed: number;
  teams: number;
  clients: number;
  members: number;
}

const STATUS_COLORS: Record<string, string> = {
  todo: "hsl(230 15% 60%)",
  in_progress: "hsl(var(--accent))",
  completed: "hsl(var(--success))",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ projects: 0, tasks: 0, completed: 0, teams: 0, clients: 0, members: 0 });
  const [trend, setTrend] = useState<any[]>([]);
  const [byStatus, setByStatus] = useState<any[]>([]);
  const [byPriority, setByPriority] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [pr, tk, tm, cl, pf, ac] = await Promise.all([
        supabase.from("projects").select("id, status"),
        supabase.from("tasks").select("id, status, priority, completed_at, created_at"),
        supabase.from("teams").select("id"),
        supabase.from("clients").select("id"),
        supabase.from("profiles").select("id"),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
      ]);

      const tasks = tk.data ?? [];
      setStats({
        projects: pr.data?.length ?? 0,
        tasks: tasks.length,
        completed: tasks.filter(t => t.status === "completed").length,
        teams: tm.data?.length ?? 0,
        clients: cl.data?.length ?? 0,
        members: pf.data?.length ?? 0,
      });

      // 30-day completion trend
      const days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));
      setTrend(days.map(d => {
        const key = format(d, "yyyy-MM-dd");
        const completed = tasks.filter(t => t.completed_at && t.completed_at.startsWith(key)).length;
        const created = tasks.filter(t => t.created_at && t.created_at.startsWith(key)).length;
        return { date: format(d, "MMM d"), completed, created };
      }));

      // Status pie
      const statusGroups = ["todo", "in_progress", "completed"].map(s => ({
        name: s.replace("_", " "),
        value: tasks.filter(t => t.status === s).length,
        key: s,
      }));
      setByStatus(statusGroups);

      // Priority bars
      const priorityGroups = ["low", "medium", "high", "urgent"].map(p => ({
        priority: p,
        count: tasks.filter(t => t.priority === p).length,
      }));
      setByPriority(priorityGroups);

      setRecent(ac.data ?? []);
    })();
  }, []);

  const completionRate = stats.tasks ? Math.round((stats.completed / stats.tasks) * 100) : 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Mission Control</h1>
          <p className="text-muted-foreground mt-1">Real-time overview of your workspace</p>
        </div>
        <Badge variant="outline" className="glass font-mono text-xs">
          {format(startOfMonth(new Date()), "MMMM yyyy")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Projects" value={stats.projects} icon={<FolderKanban className="h-5 w-5" />} accent="primary" />
        <StatCard label="Tasks" value={stats.tasks} icon={<CheckSquare className="h-5 w-5" />} accent="accent" />
        <StatCard label="Completed" value={stats.completed} icon={<TrendingUp className="h-5 w-5" />} accent="success" />
        <StatCard label="Completion" value={`${completionRate}%`} icon={<ActivityIcon className="h-5 w-5" />} accent="warning" />
        <StatCard label="Teams" value={stats.teams} icon={<Users className="h-5 w-5" />} accent="primary" />
        <StatCard label="Clients" value={stats.clients} icon={<Building2 className="h-5 w-5" />} accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2 animate-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Activity (last 30 days)</h3>
            <div className="flex gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Created</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Completed</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Area type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#g1)" />
              <Area type="monotone" dataKey="completed" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6 animate-in-up">
          <h3 className="font-display text-lg font-semibold mb-4">Task status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {byStatus.map(e => <Cell key={e.key} fill={STATUS_COLORS[e.key]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {byStatus.map(s => (
              <div key={s.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 capitalize">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.key] }} />
                  {s.name}
                </span>
                <span className="font-mono text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2 animate-in-up">
          <h3 className="font-display text-lg font-semibold mb-4">Tasks by priority</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="priority" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-6 animate-in-up">
          <h3 className="font-display text-lg font-semibold mb-4">Recent activity</h3>
          {recent.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          <ul className="space-y-3">
            {recent.map(a => (
              <li key={a.id} className="text-sm flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent mt-2 shrink-0" />
                <div>
                  <span className="font-medium capitalize">{a.action}</span>{" "}
                  <span className="text-muted-foreground">{a.entity_type}</span>
                  <p className="text-xs text-muted-foreground font-mono">{format(new Date(a.created_at), "MMM d, HH:mm")}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

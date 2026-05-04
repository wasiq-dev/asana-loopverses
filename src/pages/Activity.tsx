import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Activity as ActivityIcon } from "lucide-react";

export default function Activity() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const [{ data: l }, { data: p }] = await Promise.all([
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      setLogs(l ?? []);
      setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x])));
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold">Activity feed</h1>
        <p className="text-muted-foreground mt-1">Workspace timeline</p>
      </div>

      <div className="glass rounded-2xl p-2">
        {logs.length === 0 && <p className="text-sm text-muted-foreground p-6 text-center">No activity yet.</p>}
        <ul className="divide-y divide-border">
          {logs.map(a => {
            const profile = profiles[a.user_id];
            return (
              <li key={a.id} className="p-4 flex items-start gap-3 hover:bg-secondary/30 rounded-xl transition-colors">
                <div className="h-9 w-9 rounded-lg bg-gradient-primary/20 text-primary flex items-center justify-center shrink-0"><ActivityIcon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{profile?.full_name || profile?.email || "Someone"}</span>{" "}
                    <span className="capitalize text-muted-foreground">{a.action}</span>{" "}
                    <span className="font-mono text-xs px-1.5 py-0.5 bg-secondary rounded">{a.entity_type}</span>
                    {a.metadata?.name && <> · <span>{a.metadata.name}</span></>}
                    {a.metadata?.title && <> · <span>{a.metadata.title}</span></>}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{format(new Date(a.created_at), "MMM d, yyyy 'at' HH:mm")}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

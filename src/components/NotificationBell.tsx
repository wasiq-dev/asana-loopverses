import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setItems(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const unread = items.filter(i => !i.read).length;

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  };

  const open = async (n: any) => {
    if (!n.read) await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary glow-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass-strong w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border/60">
          <span className="font-display font-semibold text-sm">Notifications</span>
          {unread > 0 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAll}><Check className="h-3 w-3 mr-1" />Mark all read</Button>}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No notifications</p>}
          {items.map(n => (
            <button key={n.id} onClick={() => open(n)} className={`w-full text-left p-3 border-b border-border/40 hover:bg-accent/10 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
              <div className="flex items-start gap-2">
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

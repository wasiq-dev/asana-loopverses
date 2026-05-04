import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Messages() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, email, avatar_url").then(({ data }) => {
      setProfiles((data ?? []).filter(p => p.id !== user?.id));
    });
  }, [user?.id]);

  const loadMessages = async () => {
    if (!user || !active) return;
    const { data } = await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active}),and(sender_id.eq.${active},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    // mark received as read
    await supabase.from("messages").update({ read: true }).eq("sender_id", active).eq("recipient_id", user.id).eq("read", false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => {
    loadMessages();
    if (!user || !active) return;
    const ch = supabase.channel(`dm-${user.id}-${active}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m: any = payload.new;
        if ((m.sender_id === user.id && m.recipient_id === active) || (m.sender_id === active && m.recipient_id === user.id)) {
          loadMessages();
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active, user?.id]);

  const send = async () => {
    if (!text.trim() || !user || !active) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: active, content });
    if (error) return toast.error(error.message);
    const me = (await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle()).data;
    await supabase.from("notifications").insert({
      user_id: active, type: "message",
      title: `New message from ${me?.full_name || me?.email || "User"}`,
      body: content.slice(0, 140), link: `/messages?u=${user.id}`,
    });
  };

  // pre-select via ?u=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("u");
    if (u) setActive(u);
  }, []);

  const activeProfile = profiles.find(p => p.id === active);

  return (
    <div className="max-w-[1400px] mx-auto h-[calc(100vh-8rem)] grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
      <div className="glass rounded-2xl p-3 overflow-y-auto">
        <h2 className="font-display font-semibold text-sm px-2 mb-2">Team</h2>
        {profiles.map(p => (
          <button key={p.id} onClick={() => setActive(p.id)}
            className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 hover:bg-accent/20 transition-colors ${active === p.id ? "bg-primary/10" : ""}`}>
            <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">{(p.full_name || p.email || "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
            <span className="text-sm truncate">{p.full_name || p.email}</span>
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a teammate to start chatting</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
              <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">{(activeProfile?.full_name || activeProfile?.email || "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
              <div>
                <div className="text-sm font-medium">{activeProfile?.full_name || activeProfile?.email}</div>
                <div className="text-[10px] text-muted-foreground font-mono">Direct message</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(m => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${mine ? "bg-gradient-primary text-primary-foreground" : "bg-card border border-border"}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`text-[9px] font-mono mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{format(new Date(m.created_at), "HH:mm")}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div className="p-3 border-t border-border/60 flex gap-2">
              <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message…" />
              <Button onClick={send} className="bg-gradient-primary text-primary-foreground border-0"><Send className="h-4 w-4" /></Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

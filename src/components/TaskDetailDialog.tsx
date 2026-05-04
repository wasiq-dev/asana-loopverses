import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Flag, FolderKanban, Send, AtSign } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Props {
  taskId: string | null;
  onClose: () => void;
  profiles: any[];
}

export function TaskDetailDialog({ taskId, onClose, profiles }: Props) {
  const { user } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [showMention, setShowMention] = useState(false);

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  const load = async () => {
    if (!taskId) return;
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("tasks").select("*, projects(name)").eq("id", taskId).maybeSingle(),
      supabase.from("task_comments").select("*").eq("task_id", taskId).order("created_at", { ascending: true }),
    ]);
    setTask(t);
    setComments(c ?? []);
  };

  useEffect(() => {
    if (!taskId) { setTask(null); setComments([]); return; }
    load();
    const ch = supabase.channel(`task-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [taskId]);

  const parseMentions = (text: string): string[] => {
    const ids = new Set<string>();
    const matches = text.matchAll(/@\[([^\]]+)\]\(([0-9a-f-]+)\)/g);
    for (const m of matches) ids.add(m[2]);
    return Array.from(ids);
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(@\[[^\]]+\]\([0-9a-f-]+\))/g);
    return parts.map((p, i) => {
      const m = p.match(/@\[([^\]]+)\]\([0-9a-f-]+\)/);
      if (m) return <span key={i} className="text-primary font-medium">@{m[1]}</span>;
      return <span key={i}>{p}</span>;
    });
  };

  const submit = async () => {
    if (!content.trim() || !user || !task) return;
    const mentions = parseMentions(content);
    const { error } = await supabase.from("task_comments").insert({
      task_id: task.id, user_id: user.id, content: content.trim(), mentions,
    });
    if (error) return toast.error(error.message);

    // notifications: mentions + assignee
    const notifTargets = new Set<string>(mentions);
    if (task.assignee_id && task.assignee_id !== user.id) notifTargets.add(task.assignee_id);
    notifTargets.delete(user.id);
    if (notifTargets.size > 0) {
      const me = profileMap[user.id];
      const senderName = me?.full_name || me?.email || "Someone";
      await supabase.from("notifications").insert(
        Array.from(notifTargets).map(uid => ({
          user_id: uid,
          type: mentions.includes(uid) ? "mention" : "comment",
          title: mentions.includes(uid) ? `${senderName} mentioned you` : `${senderName} commented`,
          body: content.trim().slice(0, 140).replace(/@\[([^\]]+)\]\([0-9a-f-]+\)/g, "@$1"),
          link: `/tasks?task=${task.id}`,
        }))
      );
    }
    setContent("");
  };

  const insertMention = (p: any) => {
    const name = p.full_name || p.email || "user";
    setContent(c => c + `@[${name}](${p.id}) `);
    setShowMention(false);
  };

  if (!taskId) return null;

  return (
    <Dialog open={!!taskId} onOpenChange={() => onClose()}>
      <DialogContent className="glass-strong max-w-2xl max-h-[85vh] overflow-y-auto">
        {task && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl pr-8">{task.title}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2"><Flag className="h-3.5 w-3.5 text-muted-foreground" /><Badge variant="outline" className="capitalize">{task.priority}</Badge></div>
              <div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{task.status.replace("_", " ")}</Badge></div>
              {task.due_date && <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono">{format(new Date(task.due_date), "MMM d, yyyy")}</span></div>}
              {task.projects?.name && <div className="flex items-center gap-2"><FolderKanban className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono">{task.projects.name}</span></div>}
              {task.assignee_id && (
                <div className="flex items-center gap-2 col-span-2">
                  <span className="text-muted-foreground">Assignee:</span>
                  <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-gradient-primary text-primary-foreground">{(profileMap[task.assignee_id]?.full_name || profileMap[task.assignee_id]?.email || "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                  <span>{profileMap[task.assignee_id]?.full_name || profileMap[task.assignee_id]?.email}</span>
                </div>
              )}
            </div>

            {task.description && (
              <div className="mt-2">
                <h4 className="text-xs font-mono text-muted-foreground uppercase mb-1.5">Description</h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{task.description}</p>
              </div>
            )}

            <div className="mt-4 border-t border-border/60 pt-4">
              <h4 className="text-xs font-mono text-muted-foreground uppercase mb-3">Comments ({comments.length})</h4>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {comments.map(c => {
                  const author = profileMap[c.user_id];
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <Avatar className="h-7 w-7 shrink-0"><AvatarFallback className="text-[10px] bg-gradient-primary text-primary-foreground">{(author?.full_name || author?.email || "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">{author?.full_name || author?.email || "User"}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm mt-0.5 leading-relaxed break-words">{renderContent(c.content)}</p>
                      </div>
                    </div>
                  );
                })}
                {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>}
              </div>

              <div className="mt-3 relative">
                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write a comment… use @ to mention" className="min-h-[70px] resize-none" />
                <div className="flex items-center justify-between mt-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowMention(s => !s)}><AtSign className="h-3.5 w-3.5 mr-1" />Mention</Button>
                  <Button size="sm" onClick={submit} className="bg-gradient-primary text-primary-foreground border-0"><Send className="h-3.5 w-3.5 mr-1" />Send</Button>
                </div>
                {showMention && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 glass-strong rounded-lg border border-border max-h-48 overflow-y-auto z-10">
                    {profiles.filter(p => p.id !== user?.id).map(p => (
                      <button key={p.id} onClick={() => insertMention(p)} className="w-full text-left px-3 py-2 hover:bg-accent/20 text-sm flex items-center gap-2">
                        <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-gradient-primary text-primary-foreground">{(p.full_name || p.email || "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                        {p.full_name || p.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

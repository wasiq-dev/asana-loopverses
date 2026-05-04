import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, BarChart3, Users, Zap, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const FEATURES = [
  { icon: BarChart3, title: "Realtime analytics", desc: "Monthly performance, velocity and completion at a glance." },
  { icon: Users, title: "Teams & clients", desc: "Organize your workforce around customer outcomes." },
  { icon: Zap, title: "Lightning Kanban", desc: "Drag-free status flips with deadlines and priorities." },
  { icon: Shield, title: "Role-based access", desc: "Admin and member tiers with row-level security." },
];

export default function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen overflow-hidden relative">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />

      <header className="relative z-10 max-w-7xl mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-gradient">Nebula</span>
        </div>
        <Button asChild variant="outline" className="glass"><Link to="/auth">Sign in</Link></Button>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-mono text-muted-foreground mb-6 animate-in-up">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          v1.0 — Live now
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight animate-in-up">
          Project intelligence,<br />
          <span className="text-gradient">reimagined.</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto animate-in-up">
          A futuristic command center for teams that ship. Track tasks, measure performance, and deliver client work — all in one luminous interface.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3 animate-in-up">
          <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground border-0 glow-primary">
            <Link to="/auth">Get started <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="glass"><Link to="/auth">Explore</Link></Button>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="glass rounded-2xl p-5 hover:shadow-neon transition-all animate-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="h-10 w-10 rounded-lg bg-gradient-primary/20 text-primary flex items-center justify-center mb-3"><f.icon className="h-5 w-5" /></div>
              <h3 className="font-display font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Play, Users, Zap, Shield, Globe, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Play,
    title: "Perfect Sync",
    description:
      "Server-authoritative playback keeps everyone within 1 second of each other, automatically.",
  },
  {
    icon: Users,
    title: "Watch Together",
    description:
      "Invite unlimited viewers to your room. Share a link, they join instantly.",
  },
  {
    icon: Zap,
    title: "Real-Time Chat",
    description:
      "React and chat as you watch. Messages arrive in milliseconds with Socket.IO.",
  },
  {
    icon: Shield,
    title: "Host Controls",
    description:
      "Full host powers: pause, seek, change videos, promote co-hosts, or remove disruptive viewers.",
  },
  {
    icon: Globe,
    title: "YouTube & HTML5",
    description:
      "Stream from YouTube or any direct video URL. We handle the rest.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setIsAuthenticated(true);
      }).catch(() => {});
    } catch {}

    if (document.cookie.includes("syncwatch_user=")) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleCreateRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 10);
    if (isAuthenticated) {
      router.push(`/room/${roomId}`);
    } else {
      router.push(`/auth?redirectTo=/room/${roomId}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 md:py-32 lg:py-40">
          <div
            className="absolute inset-0 -z-10 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary)/0.3), transparent)",
            }}
          />
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Real-time sync &lt; 1 second
              </Badge>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-6">
                Watch Together,{" "}
                <span className="text-primary">In Perfect Sync</span>
              </h1>

              <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-10">
                SyncWatch keeps your whole group perfectly synchronized — pause, seek, and play
                together in real time. YouTube, HTML5, and beyond.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="gap-2"
                >
                  <Play className="h-5 w-5" />
                  Create a Watch Room
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/auth">Sign in</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 border-t border-border/40">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Everything you need for a great watch party
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Built on modern tech for reliability, speed, and a seamless experience.
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-border/40">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Ready to watch together?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Sign up for free and create your first watch room in seconds.
              </p>
              <Button size="lg" onClick={handleCreateRoom} className="gap-2">
                Get started — it&apos;s free
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SyncWatch. Built with Next.js &amp; Socket.IO.
        </div>
      </footer>
    </div>
  );
}

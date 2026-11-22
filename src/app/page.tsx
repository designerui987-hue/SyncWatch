"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/Navbar";
import { useToast } from "@/components/ui/use-toast";
import {
  Play,
  Users,
  Zap,
  Shield,
  Globe,
  ChevronRight,
  Loader2,
  X,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { AccessWizard } from "@/components/wizard/AccessWizard";

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

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          setRoomName(`${user.user_metadata?.display_name || user.email?.split("@")[0] || "Party"}'s Room`);
          if (searchParams.get("create") === "true") {
            setShowModal(true);
          }
        }
      } catch {}
      setLoading(false);
    }
    checkAuth();
  }, [searchParams]);

  const handleStartCreate = () => {
    if (!isAuthenticated) {
      router.push("/auth?redirectTo=/?create=true");
      return;
    }
    setShowModal(true);
  };

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setIsCreating(true);

    try {
      const provider =
        videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")
          ? "youtube"
          : "html5";

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName.trim(),
          visibility,
          videoUrl: videoUrl.trim() || undefined,
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.room?.id) {
        throw new Error(data.error || "Failed to create watch room");
      }

      toast({
        title: "Room Created!",
        description: `Entering ${data.room.name}…`,
      });

      router.push(`/room/${data.room.id}`);
    } catch (err: any) {
      setIsCreating(false);
      toast({
        variant: "destructive",
        title: "Error Creating Room",
        description: err.message || "An unexpected error occurred.",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
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
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm bg-zinc-800 text-zinc-200 border-zinc-700">
                <Zap className="mr-1.5 h-3.5 w-3.5 text-violet-400" />
                Real-time sync &lt; 1 second
              </Badge>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-6">
                Watch Together,{" "}
                <span className="text-violet-400">In Perfect Sync</span>
              </h1>

              <p className="max-w-2xl mx-auto text-lg text-zinc-400 mb-10">
                SyncWatch keeps your whole party perfectly synchronized — pause, seek, and play
                together in real time with server-authoritative timestamps.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={handleStartCreate}
                  disabled={loading}
                  className="gap-2 bg-violet-600 hover:bg-violet-500 text-white shadow-lg"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Create a Watch Room
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowWizard(true)}
                  className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 gap-2"
                >
                  <ShieldCheck className="h-5 w-5 text-indigo-400" />
                  Access & Pricing Wizard
                </Button>
                {!isAuthenticated && (
                  <Button size="lg" variant="outline" className="border-zinc-800 hover:bg-zinc-900" asChild>
                    <Link href="/auth">Sign in</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 border-t border-zinc-800/60">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Everything you need for a great watch party
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto text-sm">
                Built on server-authoritative Socket.IO clocks and cryptographic invitations.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-violet-500/40 transition-colors"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2 text-zinc-100">{feature.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Create Room Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl relative text-zinc-100">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200"
              disabled={isCreating}
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold mb-1">Create Watch Party Room</h3>
            <p className="text-xs text-zinc-400 mb-5">
              Configure your room. A unique shareable room will be generated.
            </p>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="room-name" className="text-xs text-zinc-300">
                  Room Name
                </Label>
                <Input
                  id="room-name"
                  required
                  placeholder="Friday Movie Night"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs text-zinc-100"
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="video-url" className="text-xs text-zinc-300">
                  Initial Video URL (Optional)
                </Label>
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-xs text-zinc-100"
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Privacy &amp; Access</Label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs text-left transition-all ${
                      visibility === "private"
                        ? "border-violet-500 bg-violet-500/10 text-violet-300 font-semibold"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <div>Private</div>
                      <div className="text-[10px] font-normal text-zinc-500">Requires invite token</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`flex items-center space-x-2 p-2.5 rounded-lg border text-xs text-left transition-all ${
                      visibility === "public"
                        ? "border-violet-500 bg-violet-500/10 text-violet-300 font-semibold"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <div>Public</div>
                      <div className="text-[10px] font-normal text-zinc-500">Anyone with link joins</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  disabled={isCreating}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating || !roomName.trim()}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create Room"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <AccessWizard
            onClose={() => setShowWizard(false)}
            onSelectOption={(chosenProvider) => {
              setShowWizard(false);
              setShowModal(true);
            }}
          />
        </div>
      )}

      <footer className="border-t border-zinc-800/40 py-8">
        <div className="container mx-auto px-4 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} SyncWatch. Production-oriented open-source watch parties.
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <LandingContent />
    </Suspense>
  );
}

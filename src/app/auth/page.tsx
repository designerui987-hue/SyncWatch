"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, Play, Zap, Info } from "lucide-react";
import Link from "next/link";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Check if Supabase user is already signed in
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) router.replace(redirectTo);
      }).catch(() => {});
    } catch {}

    // Check if demo user cookie exists
    const match = document.cookie.match(/syncwatch_user=([^;]+)/);
    if (match) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
          shouldCreateUser: true,
        },
      });

      setLoading(false);

      if (error) {
        toast({
          variant: "destructive",
          title: "Supabase Magic Link",
          description: error.message || "Failed to send magic link. Use Quick Demo Sign-in below if you don't have Supabase configured yet.",
        });
      } else {
        setSent(true);
      }
    } catch (err: any) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Connection Notice",
        description: "Supabase Auth server not reachable. Use Quick Demo Sign-In below for local testing.",
      });
    }
  };

  const handleDemoSignIn = (chosenName?: string) => {
    const finalName = chosenName || displayName.trim() || email.split("@")[0] || "Demo User";
    const demoId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const userData = {
      id: demoId,
      email: email.trim() || `${demoId}@syncwatch.local`,
      displayName: finalName,
    };

    // Save demo user in cookie for SSR and localStorage for client
    document.cookie = `syncwatch_user=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=604800`;
    localStorage.setItem("syncwatch_user", JSON.stringify(userData));

    toast({
      title: "Signed In",
      description: `Welcome to SyncWatch, ${finalName}!`,
    });

    router.replace(redirectTo);
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription className="text-zinc-400">
            We sent a magic link to <strong>{email}</strong>. Click it to complete sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Button variant="ghost" onClick={() => setSent(false)} className="text-sm text-zinc-400 hover:text-zinc-200">
            Use a different email
          </Button>

          <div className="pt-2 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={() => handleDemoSignIn()}
              className="w-full text-xs text-violet-400 border-zinc-700 hover:bg-zinc-800"
            >
              Skip email check and sign in locally
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900/90 border-zinc-800 text-zinc-100 shadow-2xl backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-xl">Sign in to SyncWatch</CardTitle>
        <CardDescription className="text-zinc-400 text-xs">
          Connect your account to host rooms, invite friends, and watch in sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Magic Link Form */}
        <form onSubmit={handleSignIn} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-zinc-300">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-xs text-zinc-100"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full gap-2 text-xs h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending link…
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                Send Magic Link (Supabase)
              </>
            )}
          </Button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-zinc-800" />
          <span className="flex-shrink mx-3 text-[11px] text-zinc-500 uppercase tracking-wider">
            Or quick sign-in
          </span>
          <div className="flex-grow border-t border-zinc-800" />
        </div>

        {/* Instant Demo Sign-in */}
        <div className="space-y-2.5 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center space-x-1.5 text-violet-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Instant Local / Demo Sign-In</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Test rooms and synchronization immediately without configuring external SMTP email keys.
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Your nickname (e.g. Alex)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100 h-8"
            />
            <Button
              type="button"
              onClick={() => handleDemoSignIn()}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-8 px-3 shrink-0"
            >
              Enter
            </Button>
          </div>
        </div>

        <div className="flex items-start space-x-2 text-[11px] text-zinc-500 pt-1">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-400" />
          <span>
            To enable real magic links via email, set your live Supabase project credentials in <code className="text-zinc-400">.env.local</code>.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="p-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold w-fit text-violet-400">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-white">
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </div>
          SyncWatch
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense
          fallback={
            <div className="animate-pulse w-full max-w-md h-64 bg-zinc-900 rounded-xl" />
          }
        >
          <AuthForm />
        </Suspense>
      </main>
    </div>
  );
}

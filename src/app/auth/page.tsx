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
import { safeRedirectUrl } from "@/lib/auth-redirect";
import { Loader2, Mail, Play, ShieldCheck } from "lucide-react";
import Link from "next/link";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const redirectTo = safeRedirectUrl(searchParams.get("redirectTo"));

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Check if Supabase user is already signed in
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) router.replace(redirectTo);
      }).catch(() => {});
    } catch {}
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
          title: "Sign-In Error",
          description: error.message || "Failed to send magic link. Verify your email and Supabase credentials.",
        });
      } else {
        setSent(true);
      }
    } catch {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to reach Supabase Auth. Verify your network or credentials in .env.local.",
      });
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
            <Mail className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Check your inbox</CardTitle>
          <CardDescription className="text-zinc-400 text-xs mt-1">
            We sent a secure magic link to <strong className="text-zinc-200">{email}</strong>. Click it to complete sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <Button
            variant="ghost"
            onClick={() => setSent(false)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Use a different email address
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900/90 border-zinc-800 text-zinc-100 shadow-2xl backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center space-x-2 text-violet-400 mb-1">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
            Secure Authentication
          </span>
        </div>
        <CardTitle className="text-xl">Sign in to SyncWatch</CardTitle>
        <CardDescription className="text-zinc-400 text-xs">
          Enter your email to receive a passwordless sign-in link powered by Supabase Auth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-zinc-300">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-xs text-zinc-100"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2 text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Dispatching secure link…
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                Send Magic Link
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-[11px] text-zinc-500 pt-2">
          Protected by Supabase Auth and Row-Level Security.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="p-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold w-fit text-violet-400 hover:text-violet-300">
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

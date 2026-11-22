"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface InvitePageProps {
  params: { token: string };
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "joining" | "error" | "unauthenticated">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function acceptInvite() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("unauthenticated");
        return;
      }

      setStatus("joining");

      // 1. Attempt redemption via secure stored procedure
      const { data: rpcData, error: rpcError } = await supabase.rpc("redeem_invite_token", {
        p_token: params.token,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const result = rpcData[0];
        if (result.status === "success" || result.status === "already_member") {
          router.replace(`/room/${result.room_id}`);
          return;
        } else if (result.status === "expired_token") {
          setStatus("error");
          setErrorMsg("This invitation link has expired.");
          return;
        } else if (result.status === "max_uses_reached") {
          setStatus("error");
          setErrorMsg("This invitation link has reached its maximum number of uses.");
          return;
        } else if (result.status === "room_full") {
          setStatus("error");
          setErrorMsg("This watch room is currently at maximum capacity.");
          return;
        }
      }

      // 2. Fallback direct verification against invite_tokens table
      const { data: tokenRecord, error: tokenError } = await supabase
        .from("invite_tokens")
        .select("room_id, expires_at, max_uses, uses")
        .eq("token", params.token)
        .single();

      if (tokenError || !tokenRecord) {
        setStatus("error");
        setErrorMsg("This invite link is invalid or has expired.");
        return;
      }

      // Check expiry
      if (new Date(tokenRecord.expires_at) <= new Date()) {
        setStatus("error");
        setErrorMsg("This invite link has expired.");
        return;
      }

      // Check max uses
      if (tokenRecord.max_uses !== null && tokenRecord.uses >= tokenRecord.max_uses) {
        setStatus("error");
        setErrorMsg("This invite link has reached its maximum uses.");
        return;
      }

      // Insert member with viewer role
      const { error: memberError } = await supabase.from("room_members").upsert(
        {
          room_id: tokenRecord.room_id,
          user_id: user.id,
          role: "viewer",
        },
        { onConflict: "room_id,user_id", ignoreDuplicates: true }
      );

      if (memberError) {
        setStatus("error");
        setErrorMsg("Failed to join the room. Please try again.");
        return;
      }

      router.replace(`/room/${tokenRecord.room_id}`);
    }

    acceptInvite();
  }, [params.token, router]);

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
        <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="text-center">
            <Users className="mx-auto h-10 w-10 text-violet-400 mb-2" />
            <CardTitle className="text-lg">Sign in to Join Watch Party</CardTitle>
            <CardDescription className="text-zinc-400 text-xs">
              An account is required to verify your invite and participate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs h-9" asChild>
              <Link href={`/auth?redirectTo=/invite/${params.token}`}>Sign In to Accept</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
        <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400 mb-2" />
            <CardTitle className="text-lg">Invitation Error</CardTitle>
            <CardDescription className="text-zinc-400 text-xs">{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full text-xs border-zinc-700 hover:bg-zinc-800" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-xs text-zinc-400">Verifying invitation and connecting to watch party…</p>
      </div>
    </div>
  );
}

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

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("invite_token", params.token)
        .single();

      if (roomError || !room) {
        setStatus("error");
        setErrorMsg("This invite link is invalid or has expired.");
        return;
      }

      const { error: memberError } = await supabase.from("room_members").upsert(
        {
          room_id: room.id,
          user_id: user.id,
          role: "viewer",
          display_name:
            user.user_metadata?.display_name ?? user.email ?? "Viewer",
          avatar_url: user.user_metadata?.avatar_url ?? null,
        },
        { onConflict: "room_id,user_id", ignoreDuplicates: true }
      );

      if (memberError) {
        setStatus("error");
        setErrorMsg("Failed to join the room. Please try again.");
        return;
      }

      router.replace(`/room/${room.id}`);
    }

    acceptInvite();
  }, [params.token, router]);

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Users className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle>Sign in to join</CardTitle>
            <CardDescription>You need an account to accept this invite.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href={`/auth?redirectTo=/invite/${params.token}`}>Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
            <CardTitle>Invite error</CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">
          {status === "joining" ? "Joining room…" : "Loading…"}
        </p>
      </div>
    </div>
  );
}

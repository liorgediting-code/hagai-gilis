"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Fallback for email links GoTrue issues via the implicit flow (tokens in the
 * URL fragment: #access_token=...&refresh_token=...). A server route can
 * never see a fragment — it isn't sent in the HTTP request — so
 * /auth/callback redirects here when it gets no `code`. Browsers carry the
 * original fragment forward on a redirect whose Location has none, so by the
 * time this client component mounts, the fragment is back on the URL and we
 * can read it and finish the sign-in ourselves.
 */
export function ConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = searchParams.get("type") ?? hashParams.get("type");

    if (!accessToken || !refreshToken) {
      router.replace("/login?error=missing_code");
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        if (type === "invite") router.replace("/invite/set-password");
        else if (type === "recovery") router.replace("/reset-password");
        else router.replace("/");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 text-center text-sm text-muted-foreground">
      מתחבר...
    </div>
  );
}

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // 'invite' | 'recovery' | 'signup' | etc.
  const nextParam = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // After session exchange: route by email link type.
  if (type === "invite") {
    return NextResponse.redirect(`${origin}/invite/set-password`);
  }
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }
  if (nextParam) {
    return NextResponse.redirect(`${origin}${nextParam}`);
  }
  return NextResponse.redirect(`${origin}/`);
}

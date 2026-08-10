import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const nextParam = searchParams.get("next");

  if (!code) {
    // No `code` in the query — GoTrue may have used the implicit flow instead,
    // putting tokens in the URL fragment, which this server route can never
    // see. Redirect to a client page that can read the fragment: since this
    // redirect's Location has no fragment of its own, the browser carries the
    // original one forward automatically.
    const confirmUrl = new URL(`${origin}/auth/confirm`);
    if (type) confirmUrl.searchParams.set("type", type);
    return NextResponse.redirect(confirmUrl);
  }

  // Determine redirect target before creating the response.
  // next must be an in-app relative path — reject anything that could be
  // parsed as a different host (open redirect).
  const isSafeNext = nextParam?.startsWith("/") && !nextParam.startsWith("//");
  let redirectTo = `${origin}/`;
  if (type === "invite") redirectTo = `${origin}/invite/set-password`;
  else if (type === "recovery") redirectTo = `${origin}/reset-password`;
  else if (isSafeNext) redirectTo = `${origin}${nextParam}`;

  const response = NextResponse.redirect(redirectTo);

  // Create client that writes session cookies directly onto the redirect response,
  // so the browser receives them alongside the 307 and sends them on the next request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return response;
}

import Link from "next/link";
import { TrendingUpIcon, PencilIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteMarketPostButton } from "./_components/delete-market-post-button";
import type { Tables } from "@/lib/types/database";

type MarketPost = Tables<"market_posts">;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default async function AdminMarketPage() {
  await requireAdmin();
  const supabase = asUntyped(await createClient());

  const { data: posts } = (await supabase
    .from("market_posts")
    .select("*")
    .order("created_at", { ascending: false })) as { data: MarketPost[] | null; error: unknown };

  const list: MarketPost[] = posts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUpIcon className="size-6 text-primary" aria-hidden="true" />
          <h1 className="font-heading text-2xl font-bold text-foreground">עדכוני מניות</h1>
        </div>
        <Link
          href="/admin/market/new"
          className={buttonVariants({ className: "min-h-11" })}
        >
          פרסם עדכון
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">פוסטים ({list.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              אין עדכונים עדיין
            </p>
          ) : (
            <ul className="divide-y divide-border/30">
              {list.map((post) => (
                <li
                  key={post.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{post.title}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {formatDate(post.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/market/${post.id}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}
                    >
                      <PencilIcon className="size-3.5" aria-hidden="true" />
                      ערוך
                    </Link>
                    <DeleteMarketPostButton postId={post.id} postTitle={post.title} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

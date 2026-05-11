import { notFound } from "next/navigation";
import { TrendingUpIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Tables } from "@/lib/types/database";

type MarketPost = Pick<Tables<"market_posts">, "id" | "title" | "body" | "image_url">;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketPostForm } from "../../_components/market-post-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditMarketPostPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const supabase = asUntyped(await createClient());
  const { data: post } = (await supabase
    .from("market_posts")
    .select("id, title, body, image_url")
    .eq("id", id)
    .single()) as { data: MarketPost | null; error: unknown };

  if (!post) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUpIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">עריכת עדכון מניות</h1>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">עריכת פוסט</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <MarketPostForm post={post} />
        </CardContent>
      </Card>
    </div>
  );
}

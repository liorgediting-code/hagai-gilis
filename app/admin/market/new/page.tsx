import { TrendingUpIcon } from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketPostForm } from "../_components/market-post-form";

export default async function NewMarketPostPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUpIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">פרסם עדכון מניות</h1>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">פרטי הפוסט</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <MarketPostForm />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMarketPostAction, updateMarketPostAction } from "@/app/admin/market/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface MarketPostFormProps {
  post?: {
    id: string;
    title: string;
    body: string;
    image_url: string | null;
  };
}

const initialState: ActionState = { status: "idle" };

export function MarketPostForm({ post }: MarketPostFormProps) {
  const action = post ? updateMarketPostAction : createMarketPostAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="space-y-2">
        <Label htmlFor="title">כותרת</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={post?.title}
          placeholder="לדוגמה: ניתוח שוק — ספטמבר 2025"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">תוכן</Label>
        <textarea
          id="body"
          name="body"
          rows={6}
          required
          defaultValue={post?.body}
          placeholder="כתוב את תוכן העדכון כאן..."
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">כתובת תמונה (אופציונלי)</Label>
        <Input
          id="image_url"
          name="image_url"
          type="url"
          dir="ltr"
          defaultValue={post?.image_url ?? ""}
          placeholder="https://example.com/image.jpg"
          className="font-mono"
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שומר..." : post ? "שמור" : "פרסם"}
        </Button>
        <Link
          href="/admin/market"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ביטול
        </Link>
      </div>
    </form>
  );
}

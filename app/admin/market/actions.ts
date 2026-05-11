"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import type { Tables } from "@/lib/types/database";

type MarketPostRow = Tables<"market_posts">;

const marketPostSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  body: z.string().min(1, "תוכן נדרש"),
  image_url: z
    .string()
    .url("כתובת URL לא תקינה")
    .optional()
    .or(z.literal("")),
});

export async function createMarketPostAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireAdmin();

  const parsed = marketPostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    image_url: formData.get("image_url") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const imageUrl = parsed.data.image_url && parsed.data.image_url !== "" ? parsed.data.image_url : null;

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase.from("market_posts").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    image_url: imageUrl,
    author_id: user.id,
  })) as { data: MarketPostRow | null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה ביצירת הפוסט — נסה שנית" };
  }

  revalidatePath("/admin/market");
  redirect("/admin/market");
}

export async function updateMarketPostAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { status: "error", error: "מזהה פוסט חסר" };
  }

  const parsed = marketPostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    image_url: formData.get("image_url") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const imageUrl = parsed.data.image_url && parsed.data.image_url !== "" ? parsed.data.image_url : null;

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("market_posts")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      image_url: imageUrl,
    })
    .eq("id", id)) as { data: MarketPostRow | null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה בעדכון הפוסט — נסה שנית" };
  }

  revalidatePath("/admin/market");
  redirect("/admin/market");
}

export async function deleteMarketPostAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { status: "error", error: "מזהה פוסט חסר" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("market_posts")
    .delete()
    .eq("id", id)) as { data: null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה במחיקת הפוסט — נסה שנית" };
  }

  revalidatePath("/admin/market");
  redirect("/admin/market");
}

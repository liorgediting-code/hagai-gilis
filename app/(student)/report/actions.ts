"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import type { ActionState } from "@/app/(auth)/actions";

const bugReportSchema = z.object({
  category: z.enum(["lessons", "exercises", "summaries", "market", "other"]),
  description: z.string().trim().min(1, "תיאור נדרש").max(2000, "התיאור ארוך מדי"),
  page_url: z.string().max(500).optional().or(z.literal("")),
  user_agent: z.string().max(500).optional().or(z.literal("")),
});

export async function submitBugReportAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = bugReportSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    page_url: formData.get("page_url") ?? "",
    user_agent: formData.get("user_agent") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());
  const {
    data: { user },
  } = (await supabase.auth.getUser()) as { data: { user: { id: string } | null } };
  if (!user) return { status: "error", error: "יש להתחבר כדי לשלוח דיווח" };

  const { error } = (await supabase.from("bug_reports").insert({
    user_id: user.id,
    category: parsed.data.category,
    description: parsed.data.description,
    page_url: parsed.data.page_url ? parsed.data.page_url : null,
    user_agent: parsed.data.user_agent ? parsed.data.user_agent : null,
  })) as { error: unknown };

  if (error) return { status: "error", error: "שליחת הדיווח נכשלה, נסה שוב" };

  revalidatePath("/admin/reports");
  return { status: "success" };
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon, FileTextIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteLessonButton } from "@/app/admin/lessons/_components/delete-lesson-button";
import type { ModuleRow, LessonRow } from "@/lib/types/course-types";

interface ModuleLessonsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ModuleLessonsPage({ params }: ModuleLessonsPageProps) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: mod } = (await db
    .from("modules")
    .select("*")
    .eq("id", id)
    .single()) as { data: ModuleRow | null; error: unknown };

  if (!mod) notFound();

  const { data: lessons } = (await db
    .from("lessons")
    .select("*")
    .eq("module_id", id)
    .order("order_index")) as { data: LessonRow[] | null; error: unknown };

  const list = lessons ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← ניהול מודולים
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">{mod.title}</h1>
        <p className="text-sm text-muted-foreground">שיעורים במודול זה</p>
      </div>

      <div className="flex justify-end">
        <Link
          href={`/admin/lessons/new?module_id=${mod.id}`}
          className={buttonVariants({ className: "min-h-11" })}
        >
          הוסף שיעור
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">שיעורים ({list.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              עדיין אין שיעורים. הוסף את השיעור הראשון.
            </p>
          ) : (
            <ul className="divide-y divide-border/30">
              {list.map((lesson) => (
                <li key={lesson.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        #{lesson.order_index}
                      </span>
                      <p className="text-sm font-semibold text-foreground">{lesson.title}</p>
                      {lesson.video_url ? (
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          ✓ וידאו
                        </span>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          — ללא וידאו
                        </span>
                      )}
                    </div>
                    {lesson.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {lesson.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/summaries/${lesson.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}
                    >
                      <FileTextIcon className="size-3.5" aria-hidden="true" />
                      ערוך סיכום
                    </Link>
                    <Link
                      href={`/admin/lessons/${lesson.id}/edit?module_id=${mod.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}
                    >
                      <PencilIcon className="size-3.5" aria-hidden="true" />
                      ערוך
                    </Link>
                    <DeleteLessonButton
                      lessonId={lesson.id}
                      lessonTitle={lesson.title}
                      moduleId={mod.id}
                    />
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

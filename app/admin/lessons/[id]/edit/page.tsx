import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLessonAction } from "@/app/admin/lessons/actions";
import { LessonForm } from "@/app/admin/lessons/_components/lesson-form";
import type { LessonRow } from "@/lib/types/course-types";

interface EditLessonPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ module_id?: string }>;
}

export default async function EditLessonPage({ params, searchParams }: EditLessonPageProps) {
  await requireAdmin();
  const { id } = await params;
  const { module_id } = await searchParams;

  const supabase = await createClient();
  const { data: lesson } = (await asUntyped(supabase)
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single()) as { data: LessonRow | null; error: unknown };

  if (!lesson) notFound();

  const resolvedModuleId = module_id ?? lesson.module_id;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">עריכת שיעור</h1>
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">{lesson.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <LessonForm
            action={updateLessonAction}
            defaultValues={lesson}
            lessonId={lesson.id}
            moduleId={resolvedModuleId}
          />
        </CardContent>
      </Card>
    </div>
  );
}

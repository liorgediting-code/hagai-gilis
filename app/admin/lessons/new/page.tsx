import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createLessonAction } from "@/app/admin/lessons/actions";
import { LessonForm } from "@/app/admin/lessons/_components/lesson-form";

interface NewLessonPageProps {
  searchParams: Promise<{ unit_id?: string }>;
}

export default async function NewLessonPage({ searchParams }: NewLessonPageProps) {
  await requireAdmin();
  const { unit_id } = await searchParams;

  if (!unit_id) redirect("/admin/modules");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">שיעור חדש</h1>
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">פרטי השיעור</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <LessonForm action={createLessonAction} unitId={unit_id} />
        </CardContent>
      </Card>
    </div>
  );
}

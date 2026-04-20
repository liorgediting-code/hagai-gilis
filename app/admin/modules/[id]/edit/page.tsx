import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateModuleAction } from "@/app/admin/modules/actions";
import { ModuleForm } from "@/app/admin/modules/_components/module-form";
import type { ModuleRow } from "@/lib/types/course-types";

interface EditModulePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditModulePage({ params }: EditModulePageProps) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: mod } = (await asUntyped(supabase)
    .from("modules")
    .select("*")
    .eq("id", id)
    .single()) as { data: ModuleRow | null; error: unknown };

  if (!mod) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">עריכת מודול</h1>
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">{mod.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ModuleForm action={updateModuleAction} defaultValues={mod} moduleId={mod.id} />
        </CardContent>
      </Card>
    </div>
  );
}

import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateUnitAction } from "@/app/admin/units/actions";
import { UnitForm } from "@/app/admin/units/_components/unit-form";
import type { UnitRow } from "@/lib/types/course-types";

interface EditUnitPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUnitPage({ params }: EditUnitPageProps) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: unit } = (await asUntyped(supabase)
    .from("units")
    .select("*")
    .eq("id", id)
    .single()) as { data: UnitRow | null; error: unknown };

  if (!unit) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">עריכת יחידה</h1>
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">{unit.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <UnitForm action={updateUnitAction} moduleId={unit.module_id} unitId={unit.id} defaultValues={unit} />
        </CardContent>
      </Card>
    </div>
  );
}

import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createUnitAction } from "@/app/admin/units/actions";
import { UnitForm } from "@/app/admin/units/_components/unit-form";

interface NewUnitPageProps {
  searchParams: Promise<{ module_id?: string }>;
}

export default async function NewUnitPage({ searchParams }: NewUnitPageProps) {
  await requireAdmin();
  const { module_id } = await searchParams;

  if (!module_id) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">יחידה חדשה</h1>
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">פרטי היחידה</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <UnitForm action={createUnitAction} moduleId={module_id} />
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon, BookOpenIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteUnitButton } from "@/app/admin/units/_components/delete-unit-button";
import type { ModuleRow, UnitRow } from "@/lib/types/course-types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ModuleUnitsPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const db = asUntyped(await createClient());

  const [{ data: mod }, { data: units }] = (await Promise.all([
    db.from("modules").select("*").eq("id", id).single(),
    db.from("units").select("*").eq("module_id", id).order("order_index"),
  ])) as [{ data: ModuleRow | null }, { data: UnitRow[] | null }];

  if (!mod) notFound();
  const list = units ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← ניהול נושאים
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">{mod.title}</h1>
        <p className="text-sm text-muted-foreground">יחידות בנושא זה</p>
      </div>

      <div className="flex justify-end">
        <Link href={`/admin/units/new?module_id=${mod.id}`} className={buttonVariants({ className: "min-h-11" })}>
          הוסף יחידה
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">יחידות ({list.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">עדיין אין יחידות. הוסף את היחידה הראשונה.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {list.map((unit) => (
                <li key={unit.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">#{unit.order_index}</span>
                      <p className="text-sm font-semibold text-foreground">{unit.title}</p>
                    </div>
                    {unit.description && <p className="text-xs text-muted-foreground line-clamp-1">{unit.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/units/${unit.id}/lessons`} className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}>
                      <BookOpenIcon className="size-3.5" aria-hidden="true" />
                      נהל שיעורים
                    </Link>
                    <Link href={`/admin/units/${unit.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}>
                      <PencilIcon className="size-3.5" aria-hidden="true" />
                      ערוך
                    </Link>
                    <DeleteUnitButton unitId={unit.id} unitTitle={unit.title} moduleId={mod.id} />
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

import Link from "next/link";
import { FolderIcon, PencilIcon, BookOpenIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteModuleButton } from "./_components/delete-module-button";
import type { ModuleRow } from "@/lib/types/course-types";

export default async function AdminModulesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: modules } = (await asUntyped(supabase)
    .from("modules")
    .select("*")
    .order("order_index")) as { data: ModuleRow[] | null; error: unknown };

  const list = modules ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FolderIcon className="size-6 text-primary" aria-hidden="true" />
          <h1 className="font-heading text-2xl font-bold text-foreground">ניהול מודולים</h1>
        </div>
        <Link
          href="/admin/modules/new"
          className={buttonVariants({ className: "min-h-11" })}
        >
          הוסף מודול
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">מודולים ({list.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              עדיין אין מודולים. צור את המודול הראשון.
            </p>
          ) : (
            <ul className="divide-y divide-border/30">
              {list.map((mod) => (
                <li key={mod.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        #{mod.order_index}
                      </span>
                      <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                    </div>
                    {mod.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {mod.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/modules/${mod.id}/lessons`}
                      className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}
                    >
                      <BookOpenIcon className="size-3.5" aria-hidden="true" />
                      נהל שיעורים
                    </Link>
                    <Link
                      href={`/admin/modules/${mod.id}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}
                    >
                      <PencilIcon className="size-3.5" aria-hidden="true" />
                      ערוך
                    </Link>
                    <DeleteModuleButton moduleId={mod.id} moduleTitle={mod.title} />
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

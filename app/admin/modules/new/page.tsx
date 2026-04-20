import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createModuleAction } from "@/app/admin/modules/actions";
import { ModuleForm } from "@/app/admin/modules/_components/module-form";

export default async function NewModulePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">מודול חדש</h1>
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">פרטי המודול</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ModuleForm action={createModuleAction} />
        </CardContent>
      </Card>
    </div>
  );
}

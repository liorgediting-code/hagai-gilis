import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tables } from "@/lib/types/database";

type Profile = Tables<"profiles">;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default async function StudentsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: students } = (await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("created_at", { ascending: false })) as {
    data: Profile[] | null;
    error: unknown;
  };

  const list = students ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          תלמידים
        </h1>
        <Link
          href="/admin/students/new"
          className={buttonVariants({ className: "min-h-11 h-11 px-4" })}
        >
          הוסף תלמיד
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">
            רשימת תלמידים ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              עדיין אין תלמידים. הוסף את התלמיד הראשון.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start ps-4">שם מלא</TableHead>
                  <TableHead className="text-start">אימייל</TableHead>
                  <TableHead className="text-start pe-4">נוצר בתאריך</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((student) => (
                  <TableRow key={student.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="ps-4 font-medium">
                      <Link href={`/admin/students/${student.id}`} className="hover:text-primary transition-colors">
                        {student.full_name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell dir="ltr" className="text-muted-foreground">
                      {student.email}
                    </TableCell>
                    <TableCell className="pe-4 text-muted-foreground">
                      {formatDate(student.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

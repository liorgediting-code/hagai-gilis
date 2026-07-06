import { BugIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportForm } from "./_components/report-form";

export default function ReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BugIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">דיווח על תקלה</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        נתקלת בבעיה? ספר לנו מה קרה ונטפל בזה. הדיווח כולל אוטומטית פרטי מכשיר ודפדפן, כדי שנוכל לשחזר את התקלה.
      </p>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">פרטי הדיווח</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <ReportForm />
        </CardContent>
      </Card>
    </div>
  );
}

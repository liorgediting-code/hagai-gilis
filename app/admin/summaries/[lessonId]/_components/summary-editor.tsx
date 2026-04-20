"use client";

import { useState, useActionState } from "react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveSummaryAction } from "@/app/admin/summaries/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface SummaryEditorProps {
  lessonId: string;
  initialBody: string;
}

const initialState: ActionState = { status: "idle" };

export function SummaryEditor({ lessonId, initialBody }: SummaryEditorProps) {
  const [body, setBody] = useState(initialBody);
  const [state, formAction, isPending] = useActionState(saveSummaryAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="body_markdown" value={body} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="summary-body">עריכת Markdown</Label>
          <textarea
            id="summary-body"
            rows={20}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="כתוב את הסיכום בפורמט Markdown..."
            className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">תצוגה מקדימה</p>
          <div className="min-h-40 rounded-xl border border-border/50 bg-card px-4 py-3 text-sm
            [&>h1]:font-heading [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6
            [&>h2]:font-heading [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-5
            [&>h3]:font-heading [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-2 [&>h3]:mt-4
            [&>p]:mt-3 [&>p]:leading-7
            [&>ul]:mt-3 [&>ul]:list-disc [&>ul]:ps-6 [&>ul]:space-y-1
            [&>ol]:mt-3 [&>ol]:list-decimal [&>ol]:ps-6 [&>ol]:space-y-1
            [&>blockquote]:border-s-4 [&>blockquote]:border-primary/50 [&>blockquote]:ps-4 [&>blockquote]:italic [&>blockquote]:text-muted-foreground [&>blockquote]:mt-3
            [&>pre]:mt-3 [&>pre]:rounded-xl [&>pre]:bg-muted [&>pre]:p-4 [&>pre]:overflow-x-auto
            [&>hr]:my-6 [&>hr]:border-border/50">
            {body ? (
              <ReactMarkdown>{body}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">תצוגה מקדימה תופיע כאן...</p>
            )}
          </div>
        </div>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-primary">הסיכום נשמר בהצלחה!</p>
      )}

      <Button type="submit" disabled={isPending} className="min-h-11">
        {isPending ? "שומר..." : "שמור סיכום"}
      </Button>
    </form>
  );
}

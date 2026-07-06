"use client";

import { useActionState } from "react";

import { deleteStudentAction } from "../actions";
import type { ActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  userId: string;
  fullName: string | null;
  email: string;
}

const initial: ActionState = { status: "idle" };

export function DeleteStudentButton({ userId, fullName, email }: Props) {
  const [state, action, pending] = useActionState(deleteStudentAction, initial);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>
        מחיקת התלמיד
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>מחיקת תלמיד</DialogTitle>
          <DialogDescription>
            פעולה זו תמחק לצמיתות את {fullName ?? "התלמיד"}{" "}
            (<span dir="ltr">{email}</span>) ואת כל הנתונים שלו — התקדמות,
            הגשות תרגילים והרשאות. לא ניתן לשחזר.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <input type="hidden" name="user_id" value={userId} />
          {state.status === "error" && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              ביטול
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "מוחק…" : "מחק לצמיתות"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

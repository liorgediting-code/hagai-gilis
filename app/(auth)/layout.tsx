import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-black text-primary">
            חגי גיליס
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">פלטפורמת לימוד מסחר</p>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          {children}
        </div>
      </div>
    </div>
  );
}

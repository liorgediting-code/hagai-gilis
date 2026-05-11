"use client";

export function WhatsAppCard() {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-4">
      <p className="font-bold text-lg text-green-900">נכשלת — אל תתייאש!</p>
      <p className="text-sm text-green-800">
        יש לתאם שיעור עם חגי כדי לתרגל את החומר על מנת להמשיך.
      </p>
      <a
        href="https://wa.me/972525211955"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-6 py-3 text-white font-medium min-h-11 text-sm"
      >
        קבע שיעור עם חגי
      </a>
    </div>
  );
}

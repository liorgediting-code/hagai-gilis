import type { Metadata } from "next";
import Link from "next/link";

import { CheckCircle2Icon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { VideoEmbed } from "./_components/video-embed";

export const metadata: Metadata = {
  title: "תודה שנרשמת! | חגי גיליס",
  description: "ההרשמה התקבלה בהצלחה — ההדרכה המלאה מחכה לך כאן.",
};

const VIDEO_ID = "BLx6qafxm0U";
const WHATSAPP_NUMBER = "972525211955";
const WHATSAPP_MESSAGE = "היי! ראיתי את ההדרכה ואני רוצה לשמוע פרטים על הליווי המלא 🚀";
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const nextSteps = [
  { emoji: "📱", text: "נשלחה אליך הודעה בוואטסאפ" },
  { emoji: "💰", text: "אהבת את הסרטון? פשוט תכתוב לי \"אשמח לפרטים\" ונמשיך משם" },
  { emoji: "🎯", text: "קדימה, למה אתה מחכה?" },
];

const footerLinks = [
  { label: "כניסה", href: "/login" },
  { label: "צור קשר", href: "#" },
  { label: "הצהרת נגישות", href: "#" },
  { label: "תנאי שימוש", href: "#" },
];

export default function LeadSuccessPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2Icon className="size-20 text-green-500" aria-hidden="true" />
          <h1 className="font-heading text-5xl font-black leading-tight sm:text-6xl">
            <span className="text-green-500">מעולה!</span>{" "}
            <span className="text-primary">איזה כיף שאתה כאן!</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            אתה ממש רגע לפני הצעד הראשון שלך להבנה אמיתית של שוק ההון!
          </p>
          <p className="text-sm text-muted-foreground">ההדרכה המלאה מחכה לך כאן למטה 👇</p>
        </div>

        <Card className="w-full">
          <CardContent className="space-y-5 pt-2">
            <div className="space-y-1 text-center">
              <h2 className="font-heading text-xl font-bold sm:text-2xl">
                🎬 ההדרכה המלאה: שיטת 5 האזורים הבטוחים נחשפת!
              </h2>
              <p className="text-sm text-muted-foreground">
                ⏳ זהירות! ב-20 הדקות הקרובות כל מה שחשבתם על מניות עלול להשתנות...
              </p>
            </div>

            <VideoEmbed videoId={VIDEO_ID} />

            <div className="space-y-1 rounded-lg bg-green-500/10 p-4 text-sm ring-1 ring-green-500/30">
              <p className="text-green-400">
                💡 שים לב! ההדרכה ממוקדת (פחות מ-20 דקות) ונוגעת בבסיס הכי חשוב של השיטה
              </p>
              <p className="text-green-400/90">
                📌 כדאי לצפות כשאתה פנוי, אבל עדיף להקשיב בדרכים מאשר לחכות לזמן ה&quot;מושלם&quot;
                שלא תמיד מגיע...
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="w-full space-y-4">
          <h2 className="text-center font-heading text-xl font-bold">מה הלאה? 🚀</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {nextSteps.map((step) => (
              <Card key={step.text}>
                <CardContent className="flex flex-col items-center gap-2 pt-2 text-center">
                  <span className="text-2xl" aria-hidden="true">
                    {step.emoji}
                  </span>
                  <p className="text-sm font-medium">{step.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="w-full">
          <CardContent className="space-y-3 pt-2 text-center">
            <h2 className="font-heading text-lg font-bold sm:text-xl">
              רוצה ליווי מלא? דברו איתי בוואטסאפ 🚀
            </h2>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-lg font-bold text-white transition-opacity hover:opacity-90"
            >
              💬 לפרטים נוספים שלחו לי הודעה
            </a>
          </CardContent>
        </Card>

        <footer className="w-full space-y-3 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            יש לך עוד שאלות? אני תמיד כאן בשבילך 💬
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}

# UX Improvements Design — Hagai Gilis Trading Education App

## Summary

Improve the student-facing UX based on client feedback and lesson list provided by Hagai.

## Design Decisions

| Screen | Decision |
|---|---|
| Home screen | C — Simple dashboard: big "continue" card + quick-nav grid + progress bar |
| Lessons list | A — Linear numbered list with real lesson names and status indicators |
| Lesson detail | A — Clean: video + description + mark-complete + summary link |
| Navigation | B — Keep existing top sticky header |

## Home Screen

- Remove verbose greeting paragraph
- Large blue "continue" card showing the next incomplete lesson (title + ▶ button)
- Progress bar: "X מתוך 7 שיעורים"
- 2-column quick-nav grid: "כל השיעורים" and "סיכומים" (shown only if not denied)
- Completed count stat

## Lessons List

- Drop the card-per-module wrapper in favour of a single flat list
- Each row: order number badge + lesson title + status (✓ completed / ▶ current / circle not started)
- Active lesson gets a blue `border-s-2 border-primary` highlight
- Total progress shown at the top: "X מתוך 7 הושלמו"

## Lesson Detail

- Minimal changes — already clean
- Move breadcrumb label to just "שיעורים ← שם שיעור" (drop module in middle)
- Summary link button styled as secondary, shown only when summary exists (no change)

## Seed Data

One migration (`0003_seed_lessons.sql`) inserts:
- 1 module: "קורס המסחר — 5 האחוזים הבטוחים" (order_index 1)
- 7 lessons under it with `video_url = null`:
  1. איתור מניות כמו הר געש לפני פיצוץ
  2. תמיכה והתנגדות משמעותיים
  3. ווליום קיצוני
  4. פריצות שווא
  5. מגמה כללית
  6. שינוי מומנטום
  7. נקודת כניסה לעסקה

Migration is idempotent (uses `ON CONFLICT DO NOTHING` with fixed UUIDs).

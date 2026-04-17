# Subagents — חגי גיליס App

5 subagents שנבנו לפרויקט של חגי. כל אחד מתמחה במשימה אחת, ולכולם יש context משלהם — זה חוסך טוקנים מהשיחה הראשית.

## איך להתקין

1. בתיקיית הפרויקט שלך, צור תיקייה `.claude/agents/`
2. העתק את כל 5 קבצי ה-`.md` לתוך `.claude/agents/`
3. פתח את Claude Code — הוא יזהה את ה-subagents אוטומטית

```bash
mkdir -p .claude/agents
# העתק את הקבצים
```

## איך להפעיל

בתוך שיחה עם Claude Code, תגיד:

- **"Use frontend-builder to create a login page"**
- **"Use backend-builder to add a migration for the lessons table"**
- **"Have code-reviewer check the files I just changed"**
- **"Run rtl-auditor on the login page"**
- **"Run supabase-rls-checker after the migration"**

## מתי להשתמש בכל אחד

| Subagent | מודל | מתי | עלות |
|----------|------|-----|------|
| `frontend-builder` | Sonnet 4.6 | בניית דפים, קומפוננטות, UI | בינונית |
| `backend-builder` | Sonnet 4.6 | DB, Server Actions, RLS, Auth | בינונית |
| `code-reviewer` | Haiku 4.5 | אחרי כל פיצ'ר, לפני commit | **זולה מאוד** |
| `rtl-auditor` | Haiku 4.5 | אחרי עבודת UI, לבדיקת RTL | **זולה מאוד** |
| `supabase-rls-checker` | Haiku 4.5 | אחרי כל migration | **זולה מאוד** |

## workflow מומלץ

### כש-אני בונה פיצ'ר חדש:

1. **תכנון** — ב-main chat, ב-Plan Mode (Shift+Tab), עם Opus 4.7
2. **backend** — "Use backend-builder to create the migration and Server Action"
3. **RLS check** — "Run supabase-rls-checker on the new migration"
4. **frontend** — "Use frontend-builder to build the UI"
5. **RTL audit** — "Run rtl-auditor on the new page"
6. **code review** — "Have code-reviewer check everything"
7. **commit** — ידני

כל שלב רץ ב-context נפרד, והתוצאה בלבד חוזרת לשיחה הראשית.

## שמירה על מודלים

בחלק העליון של כל subagent יש שורה:

```yaml
model: sonnet
```

או

```yaml
model: haiku
```

**אל תשנה את זה ל-opus** — opus יקר פי 15 מ-haiku. אם subagent עושה את העבודה שלו טוב עם haiku, תשאיר כך.

## אם subagent לא טוב מספיק

תערוך את הקובץ `.md` שלו ותחדד את ההוראות. לדוגמה:
- אם `frontend-builder` לא מבין את סגנון העיצוב שלך, הוסף עוד דוגמאות
- אם `code-reviewer` מפספס בעיות, הוסף סעיף לרשימה שלו

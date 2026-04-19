-- 20260420120001_seed_exercises.sql
-- 2 placeholder exercises per lesson (fixed UUIDs, idempotent)

insert into public.exercises (id, lesson_id, title, description, order_index)
values
  -- שיעור 1: איתור מניות
  ('bbbbbbbb-0101-0101-0101-bbbbbbbbbbbb', 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
   'זיהוי מניה לפני תנועה', 'סמן על הגרף את הנקודה שבה המניה מראה סימני לחץ קדם-פיצוץ.', 1),
  ('bbbbbbbb-0102-0102-0102-bbbbbbbbbbbb', 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
   'השוואת מניות פוטנציאליות', 'מצא מבין שני הגרפים את זה עם הפוטנציאל הגבוה יותר וסמן מדוע.', 2),

  -- שיעור 2: תמיכה והתנגדות
  ('bbbbbbbb-0201-0201-0201-bbbbbbbbbbbb', 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
   'סימון אזור תמיכה', 'שרטט את אזור התמיכה המשמעותי ביותר על הגרף.', 1),
  ('bbbbbbbb-0202-0202-0202-bbbbbbbbbbbb', 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
   'סימון אזור התנגדות', 'שרטט את אזור ההתנגדות שהמחיר נדחה ממנו שוב ושוב.', 2),

  -- שיעור 3: ווליום קיצוני
  ('bbbbbbbb-0301-0301-0301-bbbbbbbbbbbb', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
   'זיהוי ווליום חריג', 'סמן את הנר שבו הווליום חריג ביחס לממוצע.', 1),
  ('bbbbbbbb-0302-0302-0302-bbbbbbbbbbbb', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
   'כניסת שחקן גדול', 'על הגרף — היכן לדעתך נכנס שחקן מוסדי? סמן וכתוב הסבר קצר.', 2),

  -- שיעור 4: פריצות שווא
  ('bbbbbbbb-0401-0401-0401-bbbbbbbbbbbb', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
   'זיהוי פריצת שווא', 'סמן על הגרף היכן התרחשה פריצת השווא.', 1),
  ('bbbbbbbb-0402-0402-0402-bbbbbbbbbbbb', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
   'פריצה אמיתית מול שווא', 'הגרף מציג שתי פריצות. סמן איזו אמיתית ואיזו שווא.', 2),

  -- שיעור 5: מגמה כללית
  ('bbbbbbbb-0501-0501-0501-bbbbbbbbbbbb', 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa',
   'קריאת מגמת השוק', 'שרטט קו מגמה המייצג את כיוון השוק על הגרף.', 1),
  ('bbbbbbbb-0502-0502-0502-bbbbbbbbbbbb', 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa',
   'התאמת כיוון עסקה', 'על פי המגמה בגרף — סמן האם תיכנס לונג או שורט ומדוע.', 2),

  -- שיעור 6: שינוי מומנטום
  ('bbbbbbbb-0601-0601-0601-bbbbbbbbbbbb', 'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa',
   'נקודת היפוך מומנטום', 'סמן את הנקודה המדויקת שבה המומנטום התהפך.', 1),
  ('bbbbbbbb-0602-0602-0602-bbbbbbbbbbbb', 'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa',
   'אות כניסה או יציאה?', 'על פי שינוי המומנטום בגרף — האם זה אות כניסה או יציאה? סמן.', 2),

  -- שיעור 7: נקודת כניסה
  ('bbbbbbbb-0701-0701-0701-bbbbbbbbbbbb', 'aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa',
   'הצבת פקודת כניסה', 'סמן על הגרף את נקודת הכניסה המדויקת לעסקה.', 1),
  ('bbbbbbbb-0702-0702-0702-bbbbbbbbbbbb', 'aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa',
   'פרמטרים מלאים לעסקה', 'על הגרף — סמן כניסה, סטופ-לוס ויעד רווח.', 2)
on conflict (id) do nothing;

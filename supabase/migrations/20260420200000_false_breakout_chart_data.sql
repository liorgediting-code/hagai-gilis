-- 20260420200000_false_breakout_chart_data.sql
-- Adds interactive candlestick chart data to lesson 4 (פריצות שווא) exercises.

UPDATE public.exercises
SET content_json = $json1${
  "type": "candle_chart_select",
  "question": "סמן את הנר שבו התרחשה פריצת השווא מעל אזור ההתנגדות",
  "resistance_level": 95.8,
  "correct_candle_index": 16,
  "explanation": "הנר ה-17 עבר את קו ההתנגדות ב-95.8 אך סגר מתחתיו. זוהי פריצת שווא קלאסית: הגופים המוסדיים ניצלו את הקונים שנכנסו מעל 95.8 ומכרו להם בשיא. הירידות החדות שבאו לאחר מכן הן הבום — ההמשך בכיוון ההפוך.",
  "candles": [
    {"date": "01/01", "open": 80.0, "high": 83.0, "low": 79.0, "close": 82.0},
    {"date": "02/01", "open": 82.0, "high": 86.0, "low": 81.0, "close": 85.0},
    {"date": "03/01", "open": 85.0, "high": 89.0, "low": 84.0, "close": 88.0},
    {"date": "04/01", "open": 88.0, "high": 92.0, "low": 87.0, "close": 91.0},
    {"date": "05/01", "open": 91.0, "high": 95.0, "low": 90.0, "close": 94.0},
    {"date": "06/01", "open": 94.0, "high": 95.8, "low": 89.5, "close": 91.0},
    {"date": "07/01", "open": 91.0, "high": 92.0, "low": 87.0, "close": 88.0},
    {"date": "08/01", "open": 88.0, "high": 89.0, "low": 84.0, "close": 85.0},
    {"date": "09/01", "open": 85.0, "high": 87.0, "low": 82.5, "close": 84.0},
    {"date": "10/01", "open": 84.0, "high": 87.0, "low": 83.0, "close": 86.0},
    {"date": "11/01", "open": 86.0, "high": 88.0, "low": 85.0, "close": 87.0},
    {"date": "12/01", "open": 87.0, "high": 90.0, "low": 86.0, "close": 89.0},
    {"date": "13/01", "open": 89.0, "high": 92.0, "low": 88.0, "close": 91.0},
    {"date": "14/01", "open": 91.0, "high": 93.0, "low": 90.0, "close": 92.0},
    {"date": "15/01", "open": 92.0, "high": 95.0, "low": 91.0, "close": 94.0},
    {"date": "16/01", "open": 94.0, "high": 95.5, "low": 92.5, "close": 93.5},
    {"date": "17/01", "open": 93.5, "high": 98.0, "low": 92.0, "close": 93.8},
    {"date": "18/01", "open": 93.0, "high": 93.5, "low": 88.0, "close": 89.0},
    {"date": "19/01", "open": 89.0, "high": 90.0, "low": 84.0, "close": 85.0},
    {"date": "20/01", "open": 85.0, "high": 86.0, "low": 80.0, "close": 81.0}
  ]
}$json1$::jsonb
WHERE id = 'bbbbbbbb-0401-0401-0401-bbbbbbbbbbbb';

UPDATE public.exercises
SET content_json = $json2${
  "type": "candle_chart_select",
  "question": "סמן את הנר שבו התרחשה פריצת השווא מתחת לאזור התמיכה",
  "support_level": 62.2,
  "correct_candle_index": 15,
  "explanation": "הנר ה-16 ירד מתחת לקו התמיכה ב-62.2 אך סגר מעליו. זוהי פריצת שווא כלפי מטה: המוסדים ניצלו את המוכרים שפחדו ממשבר וקנו מהם במחיר שפל. העליות החדות שבאו לאחר מכן הן הבום — הטיק קטן, הבום גדול.",
  "candles": [
    {"date": "01/03", "open": 75.0, "high": 77.0, "low": 73.0, "close": 74.0},
    {"date": "02/03", "open": 74.0, "high": 75.0, "low": 70.5, "close": 71.0},
    {"date": "03/03", "open": 71.0, "high": 72.0, "low": 67.0, "close": 68.0},
    {"date": "04/03", "open": 68.0, "high": 69.0, "low": 65.0, "close": 66.0},
    {"date": "05/03", "open": 66.0, "high": 67.0, "low": 63.0, "close": 64.0},
    {"date": "06/03", "open": 64.0, "high": 66.5, "low": 62.2, "close": 65.0},
    {"date": "07/03", "open": 65.0, "high": 68.0, "low": 64.0, "close": 67.0},
    {"date": "08/03", "open": 67.0, "high": 70.0, "low": 66.0, "close": 69.0},
    {"date": "09/03", "open": 69.0, "high": 71.0, "low": 68.0, "close": 70.0},
    {"date": "10/03", "open": 70.0, "high": 72.0, "low": 67.5, "close": 68.5},
    {"date": "11/03", "open": 68.5, "high": 69.5, "low": 65.5, "close": 66.5},
    {"date": "12/03", "open": 66.5, "high": 68.0, "low": 64.5, "close": 65.0},
    {"date": "13/03", "open": 65.0, "high": 66.0, "low": 63.5, "close": 64.0},
    {"date": "14/03", "open": 64.0, "high": 65.0, "low": 63.0, "close": 63.5},
    {"date": "15/03", "open": 63.5, "high": 64.5, "low": 62.5, "close": 63.2},
    {"date": "16/03", "open": 63.0, "high": 63.8, "low": 59.5, "close": 62.8},
    {"date": "17/03", "open": 63.0, "high": 67.0, "low": 62.5, "close": 66.5},
    {"date": "18/03", "open": 66.5, "high": 70.5, "low": 65.5, "close": 69.5},
    {"date": "19/03", "open": 69.5, "high": 74.0, "low": 68.5, "close": 73.0},
    {"date": "20/03", "open": 73.0, "high": 77.0, "low": 72.0, "close": 76.0}
  ]
}$json2$::jsonb
WHERE id = 'bbbbbbbb-0402-0402-0402-bbbbbbbbbbbb';

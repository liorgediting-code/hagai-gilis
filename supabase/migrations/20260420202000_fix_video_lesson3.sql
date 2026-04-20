-- 20260420202000_fix_video_lesson3.sql
-- Move Bunny video to lesson 3 (תמיכה והתנגדות) and clear lesson 4

UPDATE public.lessons
SET video_url = 'https://iframe.mediadelivery.net/embed/641236/b3411c1d-065e-4c8f-8337-fceeb1810ce2'
WHERE id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa';

UPDATE public.lessons
SET video_url = NULL
WHERE id = 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa';

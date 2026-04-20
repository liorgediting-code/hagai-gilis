-- 20260420201000_lesson4_video_url.sql
-- Sets the Bunny.net Stream video URL for lesson 4 (פריצות שווא)

UPDATE public.lessons
SET video_url = 'https://iframe.mediadelivery.net/embed/641236/b3411c1d-065e-4c8f-8337-fceeb1810ce2'
WHERE id = 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa';

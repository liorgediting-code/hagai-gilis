export function parseYouTubeEmbedUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.includes("youtube.com/embed/")) return trimmed;
  const shortMatch = trimmed.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  throw new Error("כתובת YouTube לא תקינה — השתמש בכתובת embed או watch");
}

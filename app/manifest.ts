import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "חגי גיליס — מסחר",
    short_name: "חגי מסחר",
    description: "פלטפורמה ללימוד מסחר בשווקים",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1628",
    theme_color: "#1e6fcf",
    categories: ["education", "finance"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

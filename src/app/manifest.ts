import type { MetadataRoute } from "next";

// Without this, "add to home screen" gives a browser tab with an upscaled favicon.
// With it, the shortcut opens standalone and uses the real icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "F1 Fantasy Optimizer",
    short_name: "F1 Optimizer",
    description: "Practice session pace and F1 Fantasy prices, combined into swap recommendations",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Maskable so Android can crop it to the launcher's shape without clipping the flag.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

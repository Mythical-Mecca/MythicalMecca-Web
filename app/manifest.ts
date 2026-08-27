import type { MetadataRoute } from "next";

// The generated favicon package ships a site.webmanifest with a blank name and
// white chrome. Next builds this one instead, so the installed-app name matches
// the title template in the root layout and the splash/toolbar colours are the
// same candlelit navy the site actually paints (--mm-bg in globals.css) rather
// than a white flash on launch.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mythical Mecca — the Adventurers' Guild",
    short_name: "Mythical Mecca",
    description:
      "A homebase for the geek collective. Gather, quest, and find your people.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f1c",
    theme_color: "#0b0f1c",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

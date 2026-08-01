import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "media.discordapp.net" },
    ],
  },
  // Every URL the site has ever shipped points at a page that still exists.
  // Two kinds of rule live here:
  //   1. renames — old path → its current home (themed URLs, section reshuffles)
  //   2. cut features — news, guilds, lists, the arcade and LFG are out of the
  //      launch scope (code and tables deleted; LFG lives in Discord for now),
  //      so their URLs land on the nearest live section instead of a 404.
  // All temporary (307) so the renames stay reversible until proven in prod.
  // Ordering matters: `:path*` also matches zero segments, so a bare `/lfg`
  // is covered by the `/lfg/:path*` rule.
  async redirects() {
    return [
      // legacy themed prefixes
      { source: "/command/:path*", destination: "/admin/:path*", permanent: false },
      { source: "/forge/:path*", destination: "/partner-hub/:path*", permanent: false },
      { source: "/armory/:path*", destination: "/partners/:path*", permanent: false },
      // partners (briefly lived under /community)
      { source: "/community/partners/:path*", destination: "/partners/:path*", permanent: false },
      // events (was /news-and-events, with events nested a level deeper)
      { source: "/news-and-events", destination: "/events", permanent: false },
      { source: "/news-and-events/events/:path*", destination: "/events/:path*", permanent: false },
      // quests (was /activities/quests)
      { source: "/activities", destination: "/quests", permanent: false },
      { source: "/activities/quests/:path*", destination: "/quests/:path*", permanent: false },
      { source: "/hunts", destination: "/quests", permanent: false },
      { source: "/hunts/:path*", destination: "/quests/:path*", permanent: false },
      { source: "/hunt/:path*", destination: "/quests/:path*", permanent: false },
      // Tag scanning moved to the short, mode-agnostic /q/:token landing route.
      { source: "/quests/scan", destination: "/quests", permanent: false },

      // ---- cut from launch — keep these last so live rules win -------------
      // news → the events hub
      { source: "/news/:path*", destination: "/events", permanent: false },
      { source: "/news-and-events/news/:path*", destination: "/events", permanent: false },
      { source: "/admin/posts/:path*", destination: "/admin", permanent: false },
      // LFG → Discord handles this now; land people on the dashboard
      { source: "/lfg/:path*", destination: "/dashboard", permanent: false },
      { source: "/community/lfg/:path*", destination: "/dashboard", permanent: false },
      // guilds + lists + the old community hub → the dashboard
      { source: "/groups/:path*", destination: "/dashboard", permanent: false },
      { source: "/community/guilds/:path*", destination: "/dashboard", permanent: false },
      { source: "/lists/:path*", destination: "/dashboard", permanent: false },
      { source: "/community/lists/:path*", destination: "/dashboard", permanent: false },
      { source: "/community/:path*", destination: "/dashboard", permanent: false },
      { source: "/admin/groups/:path*", destination: "/admin", permanent: false },
      { source: "/admin/lists/:path*", destination: "/admin", permanent: false },
      // arcade → the quest board
      { source: "/arcade/:path*", destination: "/quests", permanent: false },
      { source: "/activities/arcade/:path*", destination: "/quests", permanent: false },
    ];
  },
};

export default nextConfig;

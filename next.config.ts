import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF renderer reads its faces and the emblem off disk at request time.
  // Nothing imports them, so the tracer cannot see them and would ship a lambda
  // that silently falls back to Helvetica — or throws on the missing logo.
  outputFileTracingIncludes: {
    "/admin/quests/[slug]/print/pdf": [
      "./lib/pdf/fonts/**",
      "./public/MMRefined2026.png",
    ],
  },
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
  //   2. cut features — news, guilds, lists, the arcade, LFG, and the old
  //      member dashboard/boards. All temporary (307) so the renames stay
  //      reversible until proven in prod.
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
      // The hub used to manage a single stall at a flat path. It is now scoped
      // per stall (/partner-hub/:partnerId/…), which these bookmarks can't know
      // — send them to the picker rather than guess a stall.
      { source: "/partner-hub/profile", destination: "/partner-hub", permanent: false },
      { source: "/partner-hub/gallery", destination: "/partner-hub", permanent: false },
      // Retired member-app landings. Detail URLs (/events/:slug, /quests/:slug)
      // stay; the boards and guild hall route through continue so a keeper
      // bookmark still reaches admin/hub.
      { source: "/dashboard", destination: "/auth/continue", permanent: false },
      { source: "/profile", destination: "/auth/continue", permanent: false },
      { source: "/events/submit", destination: "/", permanent: false },
      { source: "/events", destination: "/", permanent: false },
      { source: "/quests", destination: "/", permanent: false },
      // events (was /news-and-events, with events nested a level deeper)
      { source: "/news-and-events", destination: "/", permanent: false },
      { source: "/news-and-events/events/:path*", destination: "/events/:path*", permanent: false },
      // quests (was /activities/quests)
      { source: "/activities", destination: "/", permanent: false },
      { source: "/activities/quests/:path*", destination: "/quests/:path*", permanent: false },
      { source: "/hunts", destination: "/", permanent: false },
      { source: "/hunts/:path*", destination: "/quests/:path*", permanent: false },
      { source: "/hunt/:path*", destination: "/quests/:path*", permanent: false },
      { source: "/quests/scan", destination: "/", permanent: false },

      // ---- cut from launch — keep these last so live rules win -------------
      { source: "/news/:path*", destination: "/", permanent: false },
      { source: "/news-and-events/news/:path*", destination: "/", permanent: false },
      { source: "/admin/posts/:path*", destination: "/admin", permanent: false },
      { source: "/lfg/:path*", destination: "/", permanent: false },
      { source: "/community/lfg/:path*", destination: "/", permanent: false },
      { source: "/groups/:path*", destination: "/", permanent: false },
      { source: "/community/guilds/:path*", destination: "/", permanent: false },
      { source: "/lists/:path*", destination: "/", permanent: false },
      { source: "/community/lists/:path*", destination: "/", permanent: false },
      { source: "/community/:path*", destination: "/", permanent: false },
      { source: "/admin/groups/:path*", destination: "/admin", permanent: false },
      { source: "/admin/lists/:path*", destination: "/admin", permanent: false },
      { source: "/arcade/:path*", destination: "/", permanent: false },
      { source: "/activities/arcade/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;

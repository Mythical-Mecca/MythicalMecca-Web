"use client";

import { usePathname } from "next/navigation";
import { AuroraField } from "./aurora-field";
import { ParticleField } from "./particle-field";

const QUEST = "/quest-road.svg";
const GAMER = "/gamer-scene.svg";

// Same overlay treatment everywhere, different scene per section.
function sceneFor(path: string): string | null {
  if (path === "/" || path.startsWith("/news")) return null;
  if (
    path.startsWith("/hunt") ||
    path.startsWith("/events") ||
    path.startsWith("/profile") ||
    path.startsWith("/vendor-application")
  ) {
    return QUEST;
  }
  return GAMER; // dashboard, arcade, armory, etc.
}

export function AppBackdrop() {
  const path = usePathname();
  const scene = sceneFor(path);
  if (!scene) return null;

  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${scene}')` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,11,22,0.68), rgba(8,11,22,0.84))",
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <AuroraField />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-55">
        <ParticleField />
      </div>
    </div>
  );
}

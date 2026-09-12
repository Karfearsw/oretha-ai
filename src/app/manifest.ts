import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oretha AI — Uncensored Black-powered AI",
    short_name: "Oretha",
    description:
      "Uncensored Black-powered AI OS for work and creation. Chats, agents, KEVO virtual office, workflows, and a media lab in your pocket.",
    start_url: "/hub",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    orientation: "portrait",
    icons: [
      {
        src: "/oretha-logo.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

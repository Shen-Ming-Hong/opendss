import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://opendss.esperar-ai.org/", changeFrequency: "weekly", priority: 1 }];
}

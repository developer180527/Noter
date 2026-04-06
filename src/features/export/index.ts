import type { FeatureDefinition } from "@/core";

export const exportFeature: FeatureDefinition = {
  id:           "export",
  name:         "Export",
  version:      "1.0.0",
  description:  "Export notes as PDF, HTML, or Markdown.",
  dependencies: ["notes"],

  async onStart({ logger }) {
    logger.info("Export feature ready.");
  },
};

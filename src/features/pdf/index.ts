// src/features/pdf/index.ts
import type { FeatureDefinition } from "@/core/types";
import { PDFGrid }       from "./components/PDFGrid";
import { PDFViewerPage } from "./components/PDFViewerPage";

export const pdfFeature: FeatureDefinition = {
  id:          "pdf",
  name:        "PDF Viewer",
  version:     "1.0.0",
  description: "View and manage PDF documents.",

  async onInit(ctx) {
    // Grid page — registered as slot "page:pdf"
    // Activity bar opens tab with componentKey "pdf" → resolves to page:pdf
    ctx.slots.register("page:pdf", PDFGrid);

    // Viewer page — registered as slot "pdf:viewer"
    // Each PDF opens in its own tab with _componentKey "pdf:viewer"
    ctx.slots.register("pdf:viewer", PDFViewerPage);

    // Sidebar activity bar item
    ctx.events.emit("sidebar:register-item", {
      id:           "pdf",
      label:        "PDFs",
      icon:         "FileText",
      componentKey: "pdf",
      isPanelItem:  false,
      linkedTabId:  "page-pdf",
    });

    ctx.logger.info("PDF feature initialised");
  },

  async onStart(ctx) {
    ctx.logger.info("PDF feature started");
  },

  async onStop() {},
};
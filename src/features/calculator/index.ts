// src/features/calculator/index.ts
import type { FeatureDefinition } from "@/core/types";
import { CalculatorPage }         from "./components/CalculatorPage";

export const calculatorFeature: FeatureDefinition = {
  id:          "calculator",
  name:        "Calculator",
  version:     "1.0.0",
  description: "Desmos graphing calculator embedded in noter.",

  async onInit(ctx) {
    // Register the page component into the slot registry
    ctx.slots.register("page:calculator", CalculatorPage);

    // Register sidebar nav item via the event bus
    // (same pattern other features use to appear in the activity bar)
    ctx.events.emit("sidebar:register-item", {
      id:           "calculator",
      label:        "Calculator",
      icon:         "Hash",
      componentKey: "calculator",
      isPanelItem:  false,
      linkedTabId:  "page-calculator",
    });

    ctx.logger.info("Calculator initialized");
  },

  async onStart(ctx) {
    ctx.logger.info("Calculator started");
  },

  async onStop(ctx) {
    ctx.logger.info("Calculator stopped");
  },
};
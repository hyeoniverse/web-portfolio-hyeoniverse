/**
 * Portfolio Configuration Export
 *
 * This file exports the active portfolio configuration based on the USE_EXAMPLE_DATA flag.
 * Set USE_EXAMPLE_DATA to true in portfolio.config.ts to use example data.
 */

import { myConfig } from "./info.config";

// Export the active configuration
export const config = myConfig;

// Re-export types
export type { PortfolioConfig } from "./portfolio.config";

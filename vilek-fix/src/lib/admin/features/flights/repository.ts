import "server-only";
/** flights persistence boundary. Keep all feature-specific Drizzle access here. */
export { flightsRepository } from "./repository.impl";

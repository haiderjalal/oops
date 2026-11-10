import type { GeocodeResult } from "@/types/domain";

/** Port for place search. Providers are chosen by environment variables, never by calling code. */
export interface GeocoderProvider {
  readonly name: string;
  /** True when results are real-world data (false for the offline development gazetteer). */
  readonly production: boolean;
  search(
    query: string,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<GeocodeResult[]>;
}

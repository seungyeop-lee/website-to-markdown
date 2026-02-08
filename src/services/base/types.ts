import type { WtmResult } from "../../types.ts";

export interface WtmConverter {
  convert(url: string): Promise<WtmResult>;
}

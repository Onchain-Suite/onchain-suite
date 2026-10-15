import { DEFI } from "./defi";
import { PERP_DEX } from "./perp-dex";
import { PREDICTION_MARKET } from "./prediction-market";

/** The three sector playbooks, in map order. Each has its own page. */
export const PLAYBOOK_CHAPTERS = [PERP_DEX, PREDICTION_MARKET, DEFI];

import { DEFI } from "./defi";
import { PERP_DEX } from "./perp-dex";
import { PREDICTION_MARKET } from "./prediction-market";

/** The three playbooks, in chapter order. Only the reader's pick is shown. */
export const PLAYBOOK_CHAPTERS = [PERP_DEX, PREDICTION_MARKET, DEFI];

/** Short names for the contents rail. */
export const PLAYBOOK_TOC_LABELS: Record<string, string> = {
  "perp-dex": "Perp DEX playbook",
  "prediction-market": "Prediction market playbook",
  defi: "DeFi playbook",
};

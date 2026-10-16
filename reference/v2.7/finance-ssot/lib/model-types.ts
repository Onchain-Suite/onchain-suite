// Shapes the model builds in more than one pass, which TypeScript cannot infer from the JS.
//
// project() constructs each financial year from a literal, then a second pass attaches the tax
// computation to it (the charge depends on the finished year; the payment date depends on the
// charge). TypeScript sees only the literal, so the tax fields are declared here rather than
// reached for with `any` at each call site.
export type FinYear = {
  fy: number;
  label: string;
  index: number;
  months: number;
  rev: number;
  cogs: number;
  gp: number;
  opex: number;
  ebitda: number;
  ebitdaPaid: number;
  deprec: number;
  ebit: number;
  capex: number;
  endCash: number;
  endCust: number;
  endMrr: number;
  /** Attached by the corporation tax pass. */
  lossesBf: number;
  lossUsed: number;
  taxable: number;
  tax: number;
  profitAfterTax: number;
  effRate: number;
  lossesCf: number;
  taxPaidInFy: number;
  taxPaidMonth: number | null;
  founderIn: number;
  raisedIn: number;
};

export type PlanId = 'launch' | 'launchPlus' | 'growth' | 'growthPlus' | 'pro';

/** derive() seeds these as {} and fills them in a loop over PLAN_IDS, so the fields are declared here. */
export type PlanEco = {
  name: string;
  price: number;
  metered: number;
  ip: number;
  conc: number;
  stripe: number;
  partner: number;
  fixed: number;
  ceiling: number;
  list: number;
  floor: number;
  floorGM: number;
  save: number;
  overMult: number;
};

export type ServeRow = {
  metered: number;
  ip: number;
  conc: number;
  stripe: number;
  partner: number;
  total: number;
  pct: number;
};

/** One rung of the Send ladder, against the competitor's published price at the same size. */
export type SendRow = {
  n: number;
  emails: number;
  price: number;
  cost: number;
  stripe: number;
  gross: number;
  margin: number;
  eo: number | null;
  delta: number | null;
};

export type ByPlan<T> = Record<PlanId, T>;

/** The AWS sending plans, priced so the choice stays visible rather than inherited. */
export type SesPlanRow = { plan: string; rate: number; fee: number; note: string; current: boolean; deltaPer1k: number };

/** A hosting tier: one droplet carries this many customers before the next step. */
export type InfraTierRow = { maxUsers: number; rate: number; total: number; perUser: number };

/** The twelve-month runway block. The totals are attached after the lines are summed. */
export type WorstCase = {
  months: number;
  hosting: number;
  vendor: number;
  support: number;
  acquisition: number;
  overheads: number;
  cost: number;
  revenue: number;
  endCustomers: number;
  contingency: number;
  costPlus: number;
  shortfall: number;
  monthly: number;
};

/** Gross profit as a share of the plan price, at a given allowance utilisation. Attached as a
 *  function on each plan's economics, which is why it is declared rather than inferred. */
export type PlanEcoWithCurve = PlanEco & { gpPct: (u: number) => number };

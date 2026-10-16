// Mock API. Each call simulates a network round-trip and returns typed domain data.
// To go live, replace the bodies with fetch() to real endpoints — signatures stay identical.
import {
  ACTIVITY, AUTOMATIONS, CAMPAIGNS, COHORTS, DASHBOARD_KPIS, FORMS,
} from './mock';
import type { ActivityEvent, Automation, Campaign, Cohort, FormRow, Kpi } from './types';

const LATENCY = 120;
function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

export const api = {
  dashboardKpis: (): Promise<Kpi[]> => delay(DASHBOARD_KPIS),
  activity: (): Promise<ActivityEvent[]> => delay(ACTIVITY),
  campaigns: (): Promise<Campaign[]> => delay(CAMPAIGNS),
  automations: (): Promise<Automation[]> => delay(AUTOMATIONS),
  forms: (): Promise<FormRow[]> => delay(FORMS),
  cohorts: (): Promise<Cohort[]> => delay(COHORTS),
};

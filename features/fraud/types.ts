import { RiskLevelBand } from '@/types/common';

export interface FraudRuleMatch {
  ruleId: string;
  indicator: string;
  weight: number;
  explanation: string;
}

export interface FraudCheckResult {
  riskLevel: RiskLevelBand;
  riskScore: number;
  indicators: string[];
  explanation: string;
  helpline: string;
  recommendedAction: string;
}

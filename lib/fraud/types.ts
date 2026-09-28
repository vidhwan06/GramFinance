/**
 * Domain types for the Fraud Checker.
 *
 * These are pure TypeScript types that define the fraud-checking domain.
 * They are independent of the Supabase client and can be used in tests
 * without a database connection.
 */

export type FraudInputType =
  | 'message'
  | 'url'
  | 'upi'
  | 'phone'
  | 'scheme_claim'
  | 'general';

export type FraudRiskLevel = 'low' | 'medium' | 'high';

export type FraudCheckStatus = 'completed' | 'failed';

export type SignalSeverity = 'low' | 'medium' | 'high';

export type SignalCategory =
  | 'payment'
  | 'credential'
  | 'urgency'
  | 'government_claim'
  | 'link'
  | 'identity'
  | 'general';

export interface FraudSignal {
  code: string;
  name: string;
  description: string;
  severity: SignalSeverity;
  category: SignalCategory;
  weight: number;
  enabled: boolean;
}

export interface FraudSignalMatch {
  code: string;
  name: string;
  severity: SignalSeverity;
  weight: number;
  explanation: string;
  matchedText: string;
}

export interface Recommendation {
  text: string;
  signalCodes?: string[];
}

export interface FraudCheckResult {
  riskLevel: FraudRiskLevel;
  riskScore: number;
  signals: FraudSignalMatch[];
  recommendations: Recommendation[];
  recognizedSchemes: RecognizedScheme[];
  schemeFindings: SchemeClaimFinding[];
}

export interface FraudCheckRequest {
  inputType: FraudInputType;
  text: string;
}

export interface NormalizedInput {
  original: string;
  normalized: string;
}

/** A scheme identified in the user's input text. */
export interface RecognizedScheme {
  schemeId: string;
  schemeCode: string;
  schemeName: string;
  officialUrl?: string;
  matchedText: string;
}

/** The three-state result of comparing a claim against scheme data. */
export type SchemeClaimStatus = 'supported' | 'contradicted' | 'unknown';

/** A single finding from comparing a message claim against scheme information. */
export interface SchemeClaimFinding {
  schemeId: string;
  schemeCode: string;
  schemeName: string;
  claimType: string;
  status: SchemeClaimStatus;
  explanation: string;
  officialUrl?: string;
}

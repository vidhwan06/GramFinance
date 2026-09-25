export interface SchemeFilter {
  state?: string;
  district?: string;
  occupation?: string;
  ageGroup?: string;
}

export interface Scheme {
  id: string;
  name: string;
  description: string;
  targetGroups: string[];
  states: string[];
  requiredDocuments: string[];
  officialUrl: string;
  lastVerified: string;
}

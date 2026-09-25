import { ReactNode } from 'react';

export type Language = 'en' | 'kn';

export interface ChildrenProps {
  children: ReactNode;
}

export interface ClassNameProps {
  className?: string;
}

export interface BaseComponentProps extends ChildrenProps, ClassNameProps {}

export type RiskLevelBand = 'LOW' | 'MEDIUM' | 'HIGH';

export interface UserProfile {
  id?: string;
  language: Language;
  state?: string;
  district?: string;
  occupation?: string;
}

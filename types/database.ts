export interface DbUser {
  id: string;
  language: 'en' | 'kn';
  state: string | null;
  district: string | null;
  occupation: string | null;
  created_at: string;
}

export interface DbLesson {
  id: string;
  category: string;
  title_en: string;
  title_kn: string;
  content_en: Record<string, unknown>;
  content_kn: Record<string, unknown>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  updated_at: string;
}

export interface DbQuiz {
  id: string;
  lesson_id: string;
  questions_en: Record<string, unknown>[];
  questions_kn: Record<string, unknown>[];
  created_at: string;
}

export interface DbScheme {
  id: string;
  name_en: string;
  name_kn: string;
  description_en: string;
  description_kn: string;
  target_groups: string[];
  states: string[];
  required_documents: string[];
  official_url: string;
  last_verified: string;
  created_at: string;
}

export interface DbFraudPattern {
  id: string;
  category: string;
  indicator: string;
  explanation_en: string;
  explanation_kn: string;
  recommended_action_en: string;
  recommended_action_kn: string;
}

export interface DbFeedback {
  id: string;
  user_id: string | null;
  module: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

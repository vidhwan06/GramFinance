export type LessonCategory =
  | 'banking'
  | 'saving'
  | 'borrowing'
  | 'insurance'
  | 'digital-payments'
  | 'fraud-awareness';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  category: LessonCategory;
  title: string;
  description: string;
  explanation: string;
  example: string;
  practicalTakeaway: string;
  quiz: QuizQuestion[];
}

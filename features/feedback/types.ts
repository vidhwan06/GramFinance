export interface FeedbackInput {
  module: string;
  rating: number; // 1 to 5
  comment?: string;
}

export interface FeedbackSubmission extends FeedbackInput {
  id: string;
  createdAt: string;
}

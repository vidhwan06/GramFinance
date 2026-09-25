export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isRefusal?: boolean;
}

export interface AssistantResponse {
  answer: string;
  isRefusal: boolean;
  suggestedLinks?: string[];
}

export interface DashMessageProps {
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: string;
}

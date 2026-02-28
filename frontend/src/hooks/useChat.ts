import { useCallback, useRef, useEffect, useState } from 'react';
import { OpenAPI } from '@/client';
import type {
  SpreadsheetContext,
  SpreadsheetAction,
} from './useSpreadsheetContext';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

interface ChatApiRequest {
  message: string;
  context?: SpreadsheetContext | null;
  history: { role: string; content: string }[];
}

interface ChatApiResponse {
  response: string;
  actions?: SpreadsheetAction[] | null;
}

/**
 * Strip JSON code blocks from the response for display.
 * Actions are handled separately, not shown in the chat.
 */
function cleanResponseForDisplay(response: string): string {
  // Remove JSON code blocks (```json ... ```)
  let cleaned = response.replace(/```json[\s\S]*?```/g, '').trim();
  // Remove any trailing empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned || response;
}

interface UseChatOptions {
  getSpreadsheetContext?: () => SpreadsheetContext | null;
  onAction?: (action: SpreadsheetAction) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (content: string) => void;
  clearChat: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

async function sendChatMessage(
  request: ChatApiRequest,
): Promise<ChatApiResponse> {
  const token =
    typeof OpenAPI.TOKEN === 'function'
      ? await OpenAPI.TOKEN({} as never)
      : OpenAPI.TOKEN;

  console.log('Sending to API:', JSON.stringify(request, null, 2));

  const response = await fetch(`${OpenAPI.BASE}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Chat API error:', response.status, errorText);
    throw new Error(`Chat API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('API response:', data);
  return data;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { getSpreadsheetContext, onAction } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hey! I'm your AI assistant. I can help you analyze and work with your spreadsheet data. What would you like to do?",
      timestamp: new Date(Date.now() - 60000),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random()}`;
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);

      try {
        // Get current spreadsheet context
        const currentContext = getSpreadsheetContext?.() ?? null;
        console.log('Sending chat with context:', currentContext);

        // Prepare history for API (last 10 messages)
        const history = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await sendChatMessage({
          message: content.trim(),
          context: currentContext,
          history,
        });

        console.log('Received chat response:', response);

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: cleanResponseForDisplay(response.response),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Handle any actions returned by the AI
        if (response.actions && onAction) {
          for (const action of response.actions) {
            onAction(action);
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [generateId, messages, getSpreadsheetContext, onAction],
  );

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content:
          "Hey! I'm your AI assistant. I can help you analyze and work with your spreadsheet data. What would you like to do?",
        timestamp: new Date(),
      },
    ]);
    setInputValue('');
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    clearChat,
    messagesEndRef,
  };
}

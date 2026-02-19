import { useCallback, useRef, useEffect, useState } from 'react';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (content: string) => void;
  clearChat: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function useChat(
  onSendMessage?: (message: string) => Promise<string>,
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! I'm your AI assistant. How can I help you today?",
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
        // If callback provided, use it; otherwise use mock response
        let responseContent: string;

        if (onSendMessage) {
          responseContent = await onSendMessage(content);
        } else {
          // Mock response with delay
          await new Promise((resolve) => setTimeout(resolve, 1000));
          responseContent = `I received your message: "${content}". This is a demo response. Connect to an LLM API to enable real responses.`;
        }

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
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
    [generateId, onSendMessage],
  );

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: "Hey! I'm your AI assistant. How can I help you today?",
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

import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatThinking } from './ChatThinking';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function ChatWindow({
  isOpen = true,
  onClose,
  className,
}: ChatWindowProps) {
  const {
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    clearChat,
    messagesEndRef,
  } = useChat();

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'flex h-full flex-col border-l border-border bg-background',
        className,
      )}
    >
      {/* Header */}
      <div className='flex items-center justify-between border-b border-border px-4 py-3'>
        <div>
          <h2 className='font-semibold'>Assistant</h2>
          <p className='text-xs text-muted-foreground'>Always here to help</p>
        </div>
        <div className='flex gap-1'>
          <Button
            variant='ghost'
            size='icon'
            onClick={clearChat}
            title='Clear chat history'
            aria-label='Clear chat history'
          >
            <Trash2 className='h-4 w-4' />
          </Button>
          {onClose && (
            <Button
              variant='ghost'
              size='icon'
              onClick={onClose}
              title='Close chat'
              aria-label='Close chat'
            >
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-1">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            />
          ))}
          {isLoading && <ChatThinking />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={sendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}

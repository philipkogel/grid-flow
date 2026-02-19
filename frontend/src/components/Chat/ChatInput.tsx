import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = 'Ask me anything...',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, but allow Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(value);
    }
  };

  const handleSend = () => {
    onSend(value);
  };

  return (
    <div className='border-t border-border bg-background/50 p-4 backdrop-blur-sm'>
      <div className='flex gap-2'>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            'flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2',
            'text-sm placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200',
          )}
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          size='icon'
          className='flex-shrink-0'
          aria-label='Send message'
        >
          <ArrowRight className='h-4 w-4' />
        </Button>
      </div>
      <p className='mt-2 text-xs text-muted-foreground'>
        Press <kbd className='rounded bg-muted px-1.5 py-0.5'>Enter</kbd> to
        send,{' '}
        <kbd className='rounded bg-muted px-1.5 py-0.5'>Shift + Enter</kbd> for
        new line
      </p>
    </div>
  );
}

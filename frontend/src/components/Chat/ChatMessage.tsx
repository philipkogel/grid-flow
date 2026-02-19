import { MessageRole } from '@/hooks/useChat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const messageVariants = cva('flex w-full gap-3 px-4 py-3', {
  variants: {
    role: {
      user: 'justify-end',
      assistant: 'justify-start',
    },
  },
  defaultVariants: {
    role: 'assistant',
  },
});

const messageBubbleVariants = cva(
  'max-w-xs rounded-lg px-4 py-2 text-sm break-words',
  {
    variants: {
      role: {
        user: 'bg-primary text-primary-foreground',
        assistant: 'bg-card border border-border text-foreground',
      },
    },
    defaultVariants: {
      role: 'assistant',
    },
  },
);

interface ChatMessageProps extends VariantProps<typeof messageVariants> {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const formattedTime = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={messageVariants({ role })}>
      {role === 'assistant' && (
        <Avatar className='h-7 w-7 flex-shrink-0'>
          <AvatarFallback className='bg-primary/10 text-xs'>AI</AvatarFallback>
        </Avatar>
      )}

      <div
        className={
          role === 'user'
            ? 'flex flex-col items-end gap-1'
            : 'flex flex-col items-start gap-1'
        }
      >
        <div className={messageBubbleVariants({ role })}>{content}</div>
        <span className='text-xs text-muted-foreground px-2'>
          {formattedTime}
        </span>
      </div>

      {role === 'user' && (
        <Avatar className='h-7 w-7 flex-shrink-0'>
          <AvatarFallback className='bg-secondary/50 text-xs'>
            You
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

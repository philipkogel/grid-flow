import { Loader2 } from 'lucide-react';

export function ChatThinking() {
  return (
    <div className='flex items-center gap-3 px-4 py-3'>
      <div className='flex-shrink-0'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
      <div className='flex-1'>
        <p className='text-sm text-muted-foreground'>Thinking...</p>
      </div>
    </div>
  );
}

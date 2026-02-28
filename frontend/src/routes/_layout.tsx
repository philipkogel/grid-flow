import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useState } from 'react';

import { Footer } from '@/components/Common/Footer';
import AppSidebar from '@/components/Sidebar/AppSidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ChatWindow } from '@/components/Chat/ChatWindow';
import { SpreadsheetProvider } from '@/hooks/useSpreadsheetContext';
import { MessageCircle } from 'lucide-react';
import { isLoggedIn } from '@/hooks/useAuth';

export const Route = createFileRoute('/_layout')({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: '/login',
      });
    }
  },
});

function Layout() {
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <SpreadsheetProvider>
      <SidebarProvider className='h-screen max-h-screen overflow-hidden'>
        <AppSidebar />
        <SidebarInset className='h-full max-h-screen overflow-hidden'>
          <header className='sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b px-4'>
            <SidebarTrigger className='-ml-1 text-muted-foreground' />
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsChatOpen(!isChatOpen)}
              title={isChatOpen ? 'Hide chat' : 'Show chat'}
              aria-label={isChatOpen ? 'Hide chat' : 'Show chat'}
            >
              <MessageCircle className='h-4 w-4' />
            </Button>
          </header>
          <div className='flex flex-1 min-h-0 overflow-hidden'>
            <main className='flex-1 overflow-auto p-6 md:p-8'>
              <div className='mx-auto max-w-7xl'>
                <Outlet />
              </div>
            </main>
            {isChatOpen && (
              <div className='w-96 flex flex-col overflow-hidden'>
                <ChatWindow
                  isOpen={isChatOpen}
                  onClose={() => setIsChatOpen(false)}
                />
              </div>
            )}
          </div>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    </SpreadsheetProvider>
  );
}

export default Layout;

'use client';

import { OrganizerSidebar } from '@/components/organizer/OrganizerSidebar';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function OrganizerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <OrganizerSidebar currentPath={pathname} />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

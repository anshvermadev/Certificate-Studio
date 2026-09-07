'use client';

import React from 'react';
import { EventProvider, useEvent } from '@/context/EventContext';
import EventNavbar from '@/components/EventNavbar';

function EventLayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading, event } = useEvent();

  return (
    <>
      <EventNavbar />
      <main className="space-y-6 mt-4">
        {isLoading ? (
          <div className="clay-card min-h-[380px] flex flex-col items-center justify-center space-y-4 p-8">
            <div className="clay-circle w-14 h-14 flex items-center justify-center animate-pulse">
              <div className="w-7 h-7 rounded-full border-3 border-[#D72638] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-bold text-[#1A1A1A]">Loading Event Workspace...</p>
            <p className="text-xs text-[#555555]">Restoring template, coordinates, and recipients from local storage</p>
          </div>
        ) : !event ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3 text-center">
            <div className="clay-card p-8 max-w-md space-y-3">
              <h2 className="text-base font-bold text-[#1A1A1A]">Event Not Found</h2>
              <p className="text-xs text-[#555555]">
                This event does not exist in your local storage or may have been deleted.
              </p>
              <a href="/events" className="clay-btn-primary px-5 py-2 text-xs font-bold inline-block">
                Go to Events Dashboard
              </a>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </>
  );
}

export default function EventLayout({
  params,
  children
}: {
  params: { eventId: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F0EB] py-3 sm:py-4 px-2 sm:px-4 lg:px-6">
      <div className="max-w-[1520px] 2xl:max-w-[1560px] mx-auto space-y-4">
        <EventProvider eventId={params.eventId}>
          <EventLayoutContent>
            {children}
          </EventLayoutContent>
        </EventProvider>
      </div>
    </div>
  );
}

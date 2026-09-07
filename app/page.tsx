'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllEvents, getActiveEventId } from '@/lib/storage';
import EventsHubPage from './events/page';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkEvents() {
      try {
        const [activeId, all] = await Promise.all([getActiveEventId(), getAllEvents()]);

        if (activeId && all.some(e => e.id === activeId)) {
          router.replace(`/events/${activeId}/upload`);
          return;
        }

        if (all.length > 0) {
          router.replace(`/events/${all[0].id}/upload`);
          return;
        }
      } catch (err) {
        // Fallback to EventsHubPage
      }
    }

    checkEvents();
  }, [router]);

  return <EventsHubPage />;
}

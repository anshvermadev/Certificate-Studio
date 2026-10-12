'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CertificateEvent,
  EventSummary
} from '@/types';
import {
  getAllEvents,
  createDefaultEvent,
  createSampleEvent,
  saveEvent,
  deleteEvent,
  duplicateEvent,
  setActiveEventId
} from '@/lib/storage';
import Tooltip from '@/components/Tooltip';
import {
  FiPlus,
  FiZap,
  FiTrash2,
  FiCopy,
  FiArrowRight,
  FiSearch,
  FiCheckCircle,
  FiUsers,
  FiImage,
  FiCalendar
} from 'react-icons/fi';
import { TbCertificate } from 'react-icons/tb';

export default function EventsHubPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CertificateEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const list = await getAllEvents();
      setEvents(list);
    } catch (e) {
      console.error('Failed to load events:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isNewModalOpen) {
        setIsNewModalOpen(false);
      }
    }
    if (isNewModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isNewModalOpen]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    const newEv = createDefaultEvent(newEventName.trim());
    await saveEvent(newEv);
    await setActiveEventId(newEv.id);
    setIsNewModalOpen(false);
    setNewEventName('');
    router.push(`/events/${newEv.id}/upload`);
  };

  const handleCreateSampleEvent = async () => {
    const sample = createSampleEvent();
    await saveEvent(sample);
    await setActiveEventId(sample.id);
    router.push(`/events/${sample.id}/upload`);
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const copy = await duplicateEvent(id);
    if (copy) {
      await loadEvents();
    }
  };

  const handleDelete = async (ev: CertificateEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete event "${ev.name}"? This cannot be undone.`)) {
      await deleteEvent(ev.id);
      await loadEvents();
    }
  };

  const filteredEvents = events.filter(ev =>
    ev.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F5F0EB] py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-[1520px] 2xl:max-w-[1560px] mx-auto space-y-6">
        {/* Top Header Card */}
        <header className="clay-header-window">
          <div className="clay-header-bar px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 !rounded-t-[26px] !rounded-b-none border-b border-[#961423]/50">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Window Dots */}
              <Tooltip content="Skeuomorphic window controls" position="bottom">
                <div className="flex items-center space-x-1.5 sm:space-x-2 mr-1 cursor-help">
                  <span className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 rounded-full window-dot-red"></span>
                  <span className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 rounded-full window-dot-yellow"></span>
                  <span className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 rounded-full window-dot-green"></span>
                </div>
              </Tooltip>

              <div className="clay-circle w-9 sm:w-11 h-9 sm:h-11 text-base sm:text-lg font-bold text-[#D72638] flex-shrink-0 flex items-center justify-center">
                <TbCertificate className="text-xl sm:text-2xl text-[#D72638]" />
              </div>

              <div>
                <h1 className="font-bold text-base sm:text-xl leading-tight tracking-tight text-white drop-shadow">
                  Certificate Studio Hub
                </h1>
                <p className="text-[11px] sm:text-xs text-white/90 font-medium line-clamp-1 sm:line-clamp-none">
                  Multi-Event Certificate Dispatcher • Zero Database • Fully Persistent
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={handleCreateSampleEvent}
                className="clay-btn-secondary px-3.5 sm:px-4 py-2 text-xs font-bold text-[#D72638] flex items-center justify-center space-x-1.5 flex-1 md:flex-none"
              >
                <FiZap className="text-xs flex-shrink-0" />
                <span>Try Demo Event</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="clay-btn-secondary px-4 sm:px-5 py-2 text-xs font-bold text-[#1A1A1A] hover:text-[#D72638] flex items-center justify-center space-x-1.5 flex-1 md:flex-none"
              >
                <FiPlus className="text-xs flex-shrink-0" />
                <span>Create New Event</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar docked in clay-nav-track */}
          <div className="clay-nav-track px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search events by title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full clay-inset pl-9 pr-3.5 py-2 text-xs font-bold text-[#1A1A1A] placeholder-[#777777] rounded-xl"
              />
              <FiSearch className="absolute left-3 top-2.5 text-xs text-[#777777]" />
            </div>

            <span className="text-xs text-[#555555] font-bold self-end sm:self-center bg-[#FAFAF8] px-3 py-1 rounded-full border border-[#E0DEDA] shadow-xs">
              {events.length} {events.length === 1 ? 'Event' : 'Events'} Stored Locally
            </span>
          </div>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="min-h-[300px] flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-3 border-[#D72638] border-t-transparent animate-spin" />
            <p className="text-xs font-bold text-[#666666]">Accessing local IndexedDB storage...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && events.length === 0 && (
          <div className="clay-card p-10 text-center space-y-4 max-w-lg mx-auto my-12">
            <div className="clay-circle w-16 h-16 mx-auto flex items-center justify-center">
              <TbCertificate className="text-3xl text-[#D72638]" />
            </div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">No Certificate Events Yet</h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Create your first event to upload a certificate template, map a recipient list, and dispatch certificates. All your data stays completely saved on your device.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="clay-btn-primary px-6 py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <FiPlus className="text-xs" />
                <span>Create Your First Event</span>
              </button>
              <button
                type="button"
                onClick={handleCreateSampleEvent}
                className="clay-btn-secondary px-5 py-2.5 text-xs font-bold text-[#D72638] flex items-center justify-center space-x-1.5"
              >
                <FiZap className="text-xs" />
                <span>Load Sample Event</span>
              </button>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && filteredEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(ev => {
              const count = ev.recipients?.length || 0;
              const sent = ev.recipients?.filter(r => r.status === 'Sent').length || 0;
              const failed = ev.recipients?.filter(r => r.status === 'Failed').length || 0;
              const createdDate = new Date(ev.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={ev.id}
                  onClick={() => router.push(`/events/${ev.id}/upload`)}
                  className="clay-card p-5 space-y-4 flex flex-col justify-between hover:border-[#D72638] transition cursor-pointer group"
                >
                  <div className="space-y-3">
                    {/* Header: Title & Options */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-[#1A1A1A] group-hover:text-[#D72638] transition line-clamp-2">
                        {ev.name}
                      </h3>
                      <div className="flex items-center space-x-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Tooltip content="Duplicate event" position="top">
                          <button
                            type="button"
                            onClick={e => handleDuplicate(ev.id, e)}
                            className="w-7 h-7 rounded-lg clay-btn-secondary flex items-center justify-center hover:text-[#D72638] text-xs"
                          >
                            <FiCopy className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>

                        <Tooltip content="Delete event" position="top">
                          <button
                            type="button"
                            onClick={e => handleDelete(ev, e)}
                            className="w-7 h-7 rounded-lg clay-btn-secondary flex items-center justify-center text-red-600 hover:text-red-700 text-xs"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Template Thumbnail or Stylized Placeholder */}
                    <div className="w-full h-32 rounded-xl clay-inset flex items-center justify-center overflow-hidden relative bg-[#EDE8E1]">
                      {ev.templateDataUrl ? (
                        <img
                          src={ev.templateDataUrl}
                          alt={ev.name}
                          className="w-full h-full object-contain p-1 rounded-xl"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#888888] space-y-1">
                          <FiImage className="text-2xl" />
                          <span className="text-[10px] font-bold">No Custom Template</span>
                        </div>
                      )}

                      {/* Small badge overlay */}
                      <span className="absolute bottom-2 right-2 text-[9px] font-mono font-bold bg-[#1A1A1A]/80 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                        {ev.templateFileName || 'Default SVG'}
                      </span>
                    </div>

                    {/* Event Stats Chips */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="clay-inset px-2.5 py-1.5 rounded-lg flex items-center space-x-2">
                        <FiUsers className="text-xs text-[#666666]" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#777777] font-semibold uppercase">Recipients</p>
                          <p className="text-xs font-bold text-[#1A1A1A]">{count}</p>
                        </div>
                      </div>

                      <div className="clay-inset px-2.5 py-1.5 rounded-lg flex items-center space-x-2">
                        <FiCheckCircle className="text-xs text-green-600" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#777777] font-semibold uppercase">Dispatched</p>
                          <p className="text-xs font-bold text-green-700">{sent} / {count}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Bar */}
                  <div className="pt-3 border-t border-[#E0DEDA] flex items-center justify-between text-[11px] text-[#777777]">
                    <span className="flex items-center gap-1 font-medium">
                      <FiCalendar className="w-3 h-3 text-[#888888]" />
                      {createdDate}
                    </span>

                    <span className="text-xs font-bold text-[#D72638] flex items-center gap-1 group-hover:translate-x-1 transition transform">
                      <span>Open Studio</span>
                      <FiArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* New Event Modal */}
        {isNewModalOpen && (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setIsNewModalOpen(false); }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          >
            <div className="clay-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto relative my-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[#1A1A1A] flex items-center space-x-2">
                  <FiPlus className="text-[#D72638]" />
                  <span>Create New Certificate Event</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 text-[#666666] hover:text-[#1A1A1A] flex items-center justify-center text-lg font-bold transition cursor-pointer"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <p className="text-xs text-[#666666]">
                Give your event a descriptive title (e.g. course name, conference, or awards ceremony).
              </p>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="e.g. AI Hackathon 2026, Annual Awards..."
                    value={newEventName}
                    onChange={e => setNewEventName(e.target.value)}
                    className="w-full clay-inset px-3.5 py-2.5 text-xs font-bold text-[#1A1A1A] placeholder-[#888888]"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="clay-btn-secondary px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="clay-btn-primary px-5 py-2 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <FiPlus className="text-xs" />
                    <span>Create Event</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

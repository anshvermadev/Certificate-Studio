'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEvent } from '@/context/EventContext';
import Tooltip from '@/components/Tooltip';
import { SmtpModal } from '@/components/Modals';
import {
  FiZap,
  FiSettings,
  FiPlus,
  FiChevronDown,
  FiCheck,
  FiGrid,
  FiEdit2,
  FiTrash2,
  FiCopy
} from 'react-icons/fi';
import { TbCertificate } from 'react-icons/tb';

export default function EventNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    event,
    allEvents,
    smtpConfig,
    updateSmtp,
    addLog,
    createEvent,
    deleteCurrentEvent,
    duplicateCurrentEvent,
    updateEvent,
    loadSampleDataIntoCurrentEvent
  } = useEvent();

  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const [newEventName, setNewEventName] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const switcherRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isNewEventModalOpen) setIsNewEventModalOpen(false);
        if (isRenameModalOpen) setIsRenameModalOpen(false);
      }
    }
    if (isNewEventModalOpen || isRenameModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isNewEventModalOpen, isRenameModalOpen]);

  const eventId = event?.id || '';
  const eventName = event?.name || 'Loading Event...';

  // Determine active step from pathname
  const isUpload = pathname.endsWith('/upload');
  const isDesigner = pathname.endsWith('/designer');
  const isRecipients = pathname.endsWith('/recipients');
  const isDispatch = pathname.endsWith('/dispatch');

  const recipientsCount = event?.recipients?.length || 0;
  const sentCount = event?.recipients?.filter(r => r.status === 'Sent').length || 0;

  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    const newId = await createEvent(newEventName.trim());
    setNewEventName('');
    setIsNewEventModalOpen(false);
    setIsSwitcherOpen(false);
    router.push(`/events/${newId}/upload`);
  };

  const handleRenameEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    updateEvent({ name: renameValue.trim() });
    setIsRenameModalOpen(false);
  };

  const handleDuplicate = async () => {
    setIsSwitcherOpen(false);
    const newId = await duplicateCurrentEvent();
    if (newId) {
      router.push(`/events/${newId}/upload`);
    }
  };

  const handleDelete = async () => {
    setIsSwitcherOpen(false);
    if (window.confirm(`Are you sure you want to delete "${event.name}"? This action cannot be undone.`)) {
      await deleteCurrentEvent();
    }
  };

  return (
    <>
      <header className="clay-header-window relative z-30">
        {/* Top Skeuomorphic Window Header with Window Dots & Title */}
        <div className="clay-header-bar px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 !rounded-t-[26px] !rounded-b-none border-b border-[#961423]/50">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Inset Decorative Window Dots */}
            <Tooltip content="Skeuomorphic window controls" position="bottom">
              <div className="flex items-center space-x-1.5 sm:space-x-2 mr-1 cursor-help">
                <span className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 rounded-full window-dot-red"></span>
                <span className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 rounded-full window-dot-yellow"></span>
                <span className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 rounded-full window-dot-green"></span>
              </div>
            </Tooltip>

            {/* Circular Clay Logo Badge */}
            <Link href="/events" className="group">
              <div className="clay-circle w-9 sm:w-11 h-9 sm:h-11 text-base sm:text-lg font-bold text-[#D72638] flex-shrink-0 flex items-center justify-center group-hover:scale-105 transition">
                <TbCertificate className="text-xl sm:text-2xl text-[#D72638]" />
              </div>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight text-white drop-shadow truncate">
                  Certificate Studio
                </h1>

                {/* Event Switcher Dropdown Trigger */}
                <div className="relative inline-block" ref={switcherRef}>
                  <button
                    type="button"
                    onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                    className="clay-btn-secondary px-2.5 py-1 text-xs font-bold text-[#1A1A1A] flex items-center space-x-1.5 rounded-xl transition hover:border-[#D72638]"
                  >
                    <span className="max-w-[140px] sm:max-w-[200px] truncate text-[#D72638]">
                      {eventName}
                    </span>
                    <FiChevronDown className={`text-xs text-[#666666] transition-transform duration-200 ${isSwitcherOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Switcher Dropdown Menu */}
                  {isSwitcherOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[#FAFAF8] shadow-[8px_8px_24px_rgba(0,0,0,0.35),-4px_-4px_12px_rgba(255,255,255,0.9)] border border-[#E0DEDA] p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#888888] flex justify-between items-center">
                        <span>Your Events ({allEvents.length})</span>
                        <Link
                          href="/events"
                          onClick={() => setIsSwitcherOpen(false)}
                          className="text-[#D72638] hover:underline flex items-center gap-1 normal-case font-bold"
                        >
                          <FiGrid className="w-3 h-3" /> Dashboard
                        </Link>
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1 py-1">
                        {allEvents.map(e => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => {
                              setIsSwitcherOpen(false);
                              router.push(`/events/${e.id}/upload`);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                              e.id === event?.id
                                ? 'bg-[#EDE8E1] text-[#D72638] shadow-inner'
                                : 'hover:bg-[#F2EEE9] text-[#1A1A1A]'
                            }`}
                          >
                            <span className="truncate pr-2">{e.name}</span>
                            {e.id === event?.id && <FiCheck className="text-[#D72638] flex-shrink-0" />}
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-[#E0DEDA] mt-1.5 pt-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSwitcherOpen(false);
                            setIsNewEventModalOpen(true);
                          }}
                          className="w-full clay-btn-primary py-1.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5"
                        >
                          <FiPlus className="text-xs" />
                          <span>Create New Event</span>
                        </button>

                        <div className="grid grid-cols-3 gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRenameValue(event?.name || '');
                              setIsSwitcherOpen(false);
                              setIsRenameModalOpen(true);
                            }}
                            className="clay-btn-secondary py-1 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1"
                          >
                            <FiEdit2 className="w-3 h-3 text-[#666666]" />
                            <span>Rename</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleDuplicate}
                            className="clay-btn-secondary py-1 text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1"
                          >
                            <FiCopy className="w-3 h-3 text-[#666666]" />
                            <span>Duplicate</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleDelete}
                            className="clay-btn-secondary py-1 text-[11px] font-bold text-red-600 hover:text-red-700 rounded-lg flex items-center justify-center space-x-1"
                          >
                            <FiTrash2 className="w-3 h-3 text-red-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-white/85 font-semibold line-clamp-1 sm:line-clamp-none">
                Smart Excel Mapping • Bulk Certificate Generator • Email Dispatcher
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            {recipientsCount === 0 && (
              <Tooltip content="Load 5 sample recipients to test features without uploading files" position="bottom" className="flex-1 md:flex-none">
                <button
                  type="button"
                  id="btnLoadDemo"
                  onClick={loadSampleDataIntoCurrentEvent}
                  className="w-full md:w-auto clay-btn-secondary px-3.5 sm:px-4 py-2 text-xs font-bold text-[#D72638] flex items-center justify-center space-x-1.5"
                >
                  <FiZap className="text-sm flex-shrink-0" />
                  <span className="whitespace-nowrap">Load Demo</span>
                </button>
              </Tooltip>
            )}

            <Tooltip content="Configure Gmail or custom SMTP credentials for real email delivery" position="bottom" className="flex-1 md:flex-none">
              <button
                type="button"
                id="btnOpenSmtpModal"
                onClick={() => setIsSmtpModalOpen(true)}
                className="w-full md:w-auto clay-btn-secondary px-3.5 sm:px-4 py-2 text-xs font-bold text-[#1A1A1A] hover:text-[#D72638] flex items-center justify-center space-x-1.5"
              >
                <FiSettings className="text-sm flex-shrink-0" />
                <span className="whitespace-nowrap">SMTP Setup</span>
              </button>
            </Tooltip>

            <Tooltip content="View and manage all events" position="bottom" className="flex-1 md:flex-none">
              <Link
                href="/events"
                className="w-full md:w-auto clay-btn-secondary px-3 sm:px-3.5 py-2 text-xs font-bold text-[#1A1A1A] hover:text-[#D72638] flex items-center justify-center space-x-1.5"
              >
                <FiGrid className="text-sm flex-shrink-0" />
                <span className="whitespace-nowrap">Events</span>
              </Link>
            </Tooltip>
          </div>
        </div>

        {/* Step Wizard Indicator - Tactile Clay Page Navigation Track */}
        <div className="clay-nav-track px-2 sm:px-4 py-1.5 sm:py-2">
          <nav className="flex space-x-2 sm:space-x-3 overflow-x-auto no-scrollbar py-1" aria-label="Steps">
            <Tooltip content="Upload background template & Excel spreadsheet for this event" position="bottom">
              <Link
                href={`/events/${eventId}/upload`}
                className={`tab-btn whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-5 font-bold text-xs rounded-full flex items-center space-x-2 sm:space-x-2.5 transition ${
                  isUpload ? 'clay-btn-primary' : 'clay-btn-secondary'
                }`}
              >
                <span className="step-num w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold">1</span>
                <span>Upload & Map</span>
              </Link>
            </Tooltip>

            <Tooltip content="Position recipient names, dates, and IDs onto the canvas" position="bottom">
              <Link
                href={`/events/${eventId}/designer`}
                className={`tab-btn whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-5 font-bold text-xs rounded-full flex items-center space-x-2 sm:space-x-2.5 transition ${
                  isDesigner ? 'clay-btn-primary' : 'clay-btn-secondary'
                }`}
              >
                <span className="step-num w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold">2</span>
                <span>Visual Designer</span>
              </Link>
            </Tooltip>

            <Tooltip content="View, search, edit, and preview recipient certificates" position="bottom">
              <Link
                href={`/events/${eventId}/recipients`}
                className={`tab-btn whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-5 font-bold text-xs rounded-full flex items-center space-x-2 sm:space-x-2.5 transition ${
                  isRecipients ? 'clay-btn-primary' : 'clay-btn-secondary'
                }`}
              >
                <span className="step-num w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold">3</span>
                <span>Recipients ({recipientsCount})</span>
              </Link>
            </Tooltip>

            <Tooltip content="Send all certificates via email or download a batch ZIP archive" position="bottom">
              <Link
                href={`/events/${eventId}/dispatch`}
                className={`tab-btn whitespace-nowrap flex-shrink-0 py-2 sm:py-2.5 px-4 sm:px-5 font-bold text-xs rounded-full flex items-center space-x-2 sm:space-x-2.5 transition ${
                  isDispatch ? 'clay-btn-primary' : 'clay-btn-secondary'
                }`}
              >
                <span className="step-num w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold">4</span>
                <span>Bulk Dispatch & ZIP {sentCount > 0 ? `(${sentCount}/${recipientsCount})` : ''}</span>
              </Link>
            </Tooltip>
          </nav>
        </div>
      </header>

      {/* SMTP Modal */}
      <SmtpModal
        isOpen={isSmtpModalOpen}
        onClose={() => setIsSmtpModalOpen(false)}
        smtpConfig={smtpConfig}
        onSave={async (newConfig) => {
          await updateSmtp(newConfig);
          addLog('SMTP configuration saved successfully.', 'success');
        }}
        onLog={addLog}
      />

      {/* New Event Modal */}
      {isNewEventModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsNewEventModalOpen(false); }}
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
                onClick={() => setIsNewEventModalOpen(false)}
                className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 text-[#666666] hover:text-[#1A1A1A] flex items-center justify-center text-lg font-bold transition cursor-pointer"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-[#666666]">
              Each event holds its own certificate template image, recipient spreadsheet, coordinates, and dispatch logs.
            </p>

            <form onSubmit={handleCreateNewEvent} className="space-y-4">
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
                  onClick={() => setIsNewEventModalOpen(false)}
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

      {/* Rename Event Modal */}
      {isRenameModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsRenameModalOpen(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="clay-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto relative my-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#1A1A1A] flex items-center space-x-2">
                <FiEdit2 className="text-[#D72638]" />
                <span>Rename Event</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 text-[#666666] hover:text-[#1A1A1A] flex items-center justify-center text-lg font-bold transition cursor-pointer"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRenameEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                  New Event Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="w-full clay-inset px-3.5 py-2.5 text-xs font-bold text-[#1A1A1A]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="clay-btn-secondary px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="clay-btn-primary px-5 py-2 text-xs font-bold cursor-pointer"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

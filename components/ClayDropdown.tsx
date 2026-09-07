'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

export interface DropdownOption {
  value: string;
  label: string;
  fontFamily?: string;
}

export interface DropdownGroup {
  groupLabel?: string;
  options: DropdownOption[];
}

interface ClayDropdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options?: DropdownOption[];
  groups?: DropdownGroup[];
  placeholder?: string;
  className?: string;
  isFontSelector?: boolean;
}

export default function ClayDropdown({
  id,
  value,
  onChange,
  options,
  groups,
  placeholder = 'Select option...',
  className = '',
  isFontSelector = false
}: ClayDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize all options into groups for uniform rendering
  const normalizedGroups: DropdownGroup[] = groups || (options ? [{ options }] : []);

  // Find the currently selected option to display its label
  let selectedOption: DropdownOption | undefined;
  for (const group of normalizedGroups) {
    const found = group.options.find(opt => opt.value === value);
    if (found) {
      selectedOption = found;
      break;
    }
  }

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={`relative select-none ${className} ${isOpen ? 'z-[60]' : 'z-auto'}`}
      data-dropdown-open={isOpen ? 'true' : 'false'}
      id={id ? `${id}-wrapper` : undefined}
    >
      {/* Trigger Button - Molded Inset Clay with Tactile Chevron */}
      <button
        type="button"
        id={id}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-xs font-bold clay-inset px-3.5 py-2.5 transition-all text-left ${
          isOpen ? 'ring-2 ring-[#D72638]/40 border-[#D72638]' : ''
        }`}
      >
        <span
          className="truncate"
          style={isFontSelector && selectedOption?.fontFamily ? { fontFamily: selectedOption.fontFamily } : undefined}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <FiChevronDown
          className={`ml-2 text-[#D72638] text-xs transition-transform duration-200 flex-shrink-0 w-3.5 h-3.5 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Modern Skeuomorphic Floating Clay Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2.5 z-[70] clay-card p-2.5 max-h-72 overflow-y-auto border border-[#E0DEDA] shadow-[10px_16px_36px_rgba(165,145,125,0.45),-6px_-6px_18px_rgba(255,255,255,0.98)] animate-in fade-in zoom-in-95 duration-150 rounded-[22px] bg-[#FAFAF8]">
          {normalizedGroups.map((group, gIdx) => (
            <div key={group.groupLabel || gIdx} className="mb-2 last:mb-0">
              {/* Group Header with Carved Skeuomorphic Label */}
              {group.groupLabel && (
                <div className="px-3 py-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A7A6D]">
                    {group.groupLabel}
                  </span>
                  <div className="h-0.5 flex-1 ml-2 bg-[#E2DBD2] rounded-full"></div>
                </div>
              )}

              {/* Group Options */}
              <div className="space-y-1">
                {group.options.map(option => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-bold rounded-[14px] transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-[#D72638] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.25)]'
                          : 'text-[#1A1A1A] hover:bg-[#FDECEF] hover:text-[#D72638]'
                      }`}
                    >
                      <span
                        className="truncate text-[13px]"
                        style={isFontSelector && option.fontFamily ? { fontFamily: option.fontFamily } : undefined}
                      >
                        {option.label}
                      </span>
                      {isSelected ? (
                        <FiCheck className="text-white text-xs ml-2 font-bold w-3.5 h-3.5 flex-shrink-0" />
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 text-[#D72638] text-xs ml-2 transition-opacity">
                          •
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

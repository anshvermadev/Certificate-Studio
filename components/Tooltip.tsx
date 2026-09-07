'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
  delay = 120
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom' | 'left' | 'right';
    arrowLeft?: number;
    arrowTop?: number;
  }>({ top: 0, left: 0, placement: position });

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;

    // Use measured dimensions if tooltip rendered, or smart estimate
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 160;
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 30;

    const gap = 8;
    const margin = 10; // minimum safe margin from viewport edge
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let targetPlacement = position;
    let top = 0;
    let left = 0;
    let arrowLeft: number | undefined;
    let arrowTop: number | undefined;

    // Auto-flip vertically if colliding with top or bottom viewport edge
    if (targetPlacement === 'top' && triggerRect.top - tooltipHeight - gap < margin) {
      targetPlacement = 'bottom';
    } else if (targetPlacement === 'bottom' && triggerRect.bottom + tooltipHeight + gap > viewportHeight - margin) {
      targetPlacement = 'top';
    }

    // Auto-flip horizontally if colliding with left or right viewport edge
    if (targetPlacement === 'left' && triggerRect.left - tooltipWidth - gap < margin) {
      targetPlacement = 'right';
    } else if (targetPlacement === 'right' && triggerRect.right + tooltipWidth + gap > viewportWidth - margin) {
      targetPlacement = 'left';
    }

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;

    if (targetPlacement === 'top') {
      top = triggerRect.top - tooltipHeight - gap;
      const idealLeft = triggerCenterX - tooltipWidth / 2;
      left = Math.max(margin, Math.min(idealLeft, viewportWidth - tooltipWidth - margin));
      arrowLeft = Math.max(10, Math.min(triggerCenterX - left, tooltipWidth - 10));
    } else if (targetPlacement === 'bottom') {
      top = triggerRect.bottom + gap;
      const idealLeft = triggerCenterX - tooltipWidth / 2;
      left = Math.max(margin, Math.min(idealLeft, viewportWidth - tooltipWidth - margin));
      arrowLeft = Math.max(10, Math.min(triggerCenterX - left, tooltipWidth - 10));
    } else if (targetPlacement === 'left') {
      left = triggerRect.left - tooltipWidth - gap;
      const idealTop = triggerCenterY - tooltipHeight / 2;
      top = Math.max(margin, Math.min(idealTop, viewportHeight - tooltipHeight - margin));
      arrowTop = Math.max(8, Math.min(triggerCenterY - top, tooltipHeight - 8));
    } else if (targetPlacement === 'right') {
      left = triggerRect.right + gap;
      const idealTop = triggerCenterY - tooltipHeight / 2;
      top = Math.max(margin, Math.min(idealTop, viewportHeight - tooltipHeight - margin));
      arrowTop = Math.max(8, Math.min(triggerCenterY - top, tooltipHeight - 8));
    }

    setCoords({
      top,
      left,
      placement: targetPlacement,
      arrowLeft,
      arrowTop
    });
  }, [position]);

  useLayoutEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    if (!isVisible) return;

    // Reposition on scroll or resize; close cleanly if parent moves significantly
    const handleScrollOrResize = () => {
      setIsVisible(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible]);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  if (!content) {
    return <>{children}</>;
  }

  // Arrow style based on dynamic placement and arrow offsets
  let arrowClasses = '';
  let arrowStyle: React.CSSProperties = {};

  if (coords.placement === 'top') {
    arrowClasses = 'top-full border-t-[#1A1A1A] border-x-transparent border-b-transparent -translate-x-1/2';
    arrowStyle = coords.arrowLeft !== undefined ? { left: `${coords.arrowLeft}px` } : { left: '50%' };
  } else if (coords.placement === 'bottom') {
    arrowClasses = 'bottom-full border-b-[#1A1A1A] border-x-transparent border-t-transparent -translate-x-1/2';
    arrowStyle = coords.arrowLeft !== undefined ? { left: `${coords.arrowLeft}px` } : { left: '50%' };
  } else if (coords.placement === 'left') {
    arrowClasses = 'left-full border-l-[#1A1A1A] border-y-transparent border-r-transparent -translate-y-1/2';
    arrowStyle = coords.arrowTop !== undefined ? { top: `${coords.arrowTop}px` } : { top: '50%' };
  } else if (coords.placement === 'right') {
    arrowClasses = 'right-full border-r-[#1A1A1A] border-y-transparent border-l-transparent -translate-y-1/2';
    arrowStyle = coords.arrowTop !== undefined ? { top: `${coords.arrowTop}px` } : { top: '50%' };
  }

  return (
    <div
      ref={triggerRef}
      className={`relative ${className.includes('w-full') ? 'flex' : 'inline-flex'} items-center ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {mounted && isVisible && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            maxWidth: 'min(300px, calc(100vw - 24px))',
            pointerEvents: 'none',
            zIndex: 99999
          }}
          className="whitespace-normal break-words text-center px-2.5 py-1.5 text-[11px] font-bold text-[#FAFAF8] bg-[#1A1A1A] rounded-xl shadow-[4px_4px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.15)] border border-white/10 animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          {content}
          <span
            className={`absolute w-0 h-0 border-4 pointer-events-none ${arrowClasses}`}
            style={arrowStyle}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

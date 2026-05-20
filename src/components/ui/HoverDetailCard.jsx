import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Generic hover detail card that opens after a delay.
 * Wrap any element with this component to show a popover on hover.
 *
 * Props:
 *  - delay: ms before showing (default 2500)
 *  - content: ReactNode to render inside the popover
 *  - children: the element to wrap
 */
export default function HoverDetailCard({ children, content, delay = 2500 }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const spaceRight = window.innerWidth - rect.right;
        const spaceBelow = window.innerHeight - rect.bottom;
        
        let left = rect.left;
        let top = rect.bottom + 8;

        // If not enough space below, show above
        if (spaceBelow < 320) {
          top = rect.top - 8;
        }

        // If not enough space to the right, shift left
        if (spaceRight < 340) {
          left = Math.max(8, rect.right - 340);
        }

        setPosition({ top, left, showAbove: spaceBelow < 320 });
      }
      setVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}
      {visible && createPortal(
        <div
          className="fixed z-[9999] w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-y-auto max-h-96 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            top: position.showAbove ? undefined : position.top,
            bottom: position.showAbove ? window.innerHeight - position.top : undefined,
            left: position.left,
          }}
          onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); setVisible(true); }}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}
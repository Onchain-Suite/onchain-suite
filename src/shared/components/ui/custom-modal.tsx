"use client";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import { useIsMobile } from "@/hooks/use-mobile";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: CustomModalProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (isMobile) {
    // Mobile Drawer
    return (
      <div className="fixed inset-0 z-50">
        <div
          className="bg-background/80 fixed inset-0 backdrop-blur-sm"
          onClick={onClose}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onClose();
            }
          }}
        />
        <div className="bg-card animate-in slide-in-from-bottom fixed right-0 bottom-0 left-0 flex max-h-[90vh] flex-col rounded-t-xl shadow-2xl duration-300">
          <div className="border-border/50 flex items-center justify-between border-b p-4">
            <h2 className="text-foreground text-lg font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
            {children}
          </div>
          {footer && (
            <div className="border-border/50 bg-muted/30 border-t p-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-background/80 fixed inset-0 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClose();
          }
        }}
      />
      <div className="bg-card animate-in fade-in zoom-in-95 relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl shadow-2xl duration-300">
        <div className="border-border/50 flex items-center justify-between border-b p-6">
          <h2 className="text-foreground text-xl font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
          {children}
        </div>
        {footer && (
          <div className="border-border/50 bg-muted/30 border-t p-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RiCloseLine, RiFocus3Line } from "@remixicon/react";

export function AppModal({
  children,
  label,
  context = "Quick details",
  onClose
}: {
  children: ReactNode;
  label: string;
  context?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const firstOpenFrameRef = useRef<number | null>(null);
  const secondOpenFrameRef = useRef<number | null>(null);
  const [modalState, setModalState] = useState<"opening" | "open" | "closing">("opening");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const bodyPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    const viewportWidthBeforeLock = document.documentElement.clientWidth;
    dialog.showModal();
    body.style.overflow = "hidden";
    const viewportExpansion = document.documentElement.clientWidth - viewportWidthBeforeLock;
    if (viewportExpansion > 0) body.style.paddingRight = `${bodyPaddingRight + viewportExpansion}px`;
    firstOpenFrameRef.current = window.requestAnimationFrame(() => {
      secondOpenFrameRef.current = window.requestAnimationFrame(() => {
        setModalState("open");
        closeButtonRef.current?.focus();
      });
    });

    return () => {
      if (firstOpenFrameRef.current !== null) window.cancelAnimationFrame(firstOpenFrameRef.current);
      if (secondOpenFrameRef.current !== null) window.cancelAnimationFrame(secondOpenFrameRef.current);
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      if (dialog.open) dialog.close();
    };
  }, []);

  function closeModal() {
    if (modalState === "closing") return;
    if (firstOpenFrameRef.current !== null) window.cancelAnimationFrame(firstOpenFrameRef.current);
    if (secondOpenFrameRef.current !== null) window.cancelAnimationFrame(secondOpenFrameRef.current);
    setModalState("closing");

    const finishClose = () => {
      closeTimerRef.current = null;
      if (dialogRef.current?.open) dialogRef.current.close();
      if (onClose) onClose();
      else router.back();
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimerRef.current = window.setTimeout(finishClose, reduceMotion ? 0 : 180);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-state={modalState}
      onCancel={(event) => {
        event.preventDefault();
        closeModal();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
      className="app-modal !m-0 h-fit max-h-[calc(100dvh-2rem)] w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-left text-pulse-text max-sm:h-dvh max-sm:max-h-none sm:!m-auto sm:w-[min(94vw,80rem)] sm:rounded-2xl"
    >
      <div className="app-modal-panel flex h-fit max-h-[calc(100dvh-2rem)] min-h-0 flex-col overflow-hidden bg-slate-950 shadow-2xl ring-1 ring-inset ring-slate-600/80 max-sm:h-dvh max-sm:max-h-none sm:rounded-2xl">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-pulse-border/80 bg-slate-950/95 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-400/10 text-blue-300 ring-1 ring-blue-400/20">
              <RiFocus3Line aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{context}</p>
              <h2 id={titleId} className="truncate font-mono text-sm font-semibold text-white sm:text-base">{label}</h2>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeModal}
            aria-label={`Close ${label}`}
            className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors duration-200 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <RiCloseLine aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:flex-[0_1_auto] sm:p-6 lg:p-8 [&_[data-detail-back]]:hidden">
          {children}
        </div>
      </div>
    </dialog>
  );
}

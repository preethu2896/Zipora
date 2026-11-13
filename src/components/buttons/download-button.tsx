"use client";

import { safeDownloadName } from '@/lib/archive-safety';
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

import { cn } from "@/lib/cn";
import { ArrowDownToLine, Check, Loader2 } from "lucide-react";

type Phase = "idle" | "downloading" | "done";

export type DownloadButtonProps = Readonly<
  {
    label?: string;
    downloadingLabel?: string;
    doneLabel?: string;
    resetMs?: number;
    onDownload?: () => void | Promise<void>;
    href?: string;
    download?: string;
    onDownloadError?: (error: unknown) => void;
  } & Omit<ComponentPropsWithoutRef<"button">, "onDownload">
>;

// Icons stack in one fixed slot and crossfade, so nothing shifts.
const ICON_LAYER =
  "absolute inset-0 grid place-items-center transition-opacity duration-300 ease-out motion-reduce:transition-none";

// Labels stack in one grid cell; outgoing fades out, incoming fades in after.
const LABEL_LAYER =
  "col-start-1 row-start-1 text-left transition-opacity ease-out motion-reduce:transition-none";

// Download — raised key sinks while downloading, then settles into a green
// done state; icon morphs arrow → spinner → check in place.
export const DownloadButton = forwardRef<
  HTMLButtonElement,
  DownloadButtonProps
>(
  (
    {
      className,
      label = "Download File",
      downloadingLabel = "Starting download…",
      doneLabel = "Download started",
      resetMs = 1800,
      onDownload,
      href,
      download,
      disabled,
      onDownloadError,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [phase, setPhase] = useState<Phase>("idle");
    const [error, setError] = useState("");
    const mounted = useRef(true);
    const inFlight = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
        if (timerRef.current !== null)
          globalThis.clearTimeout(timerRef.current);
      };
    }, []);

    const schedule = (fn: () => void, ms: number) => {
      if (timerRef.current !== null) globalThis.clearTimeout(timerRef.current);
      timerRef.current = globalThis.setTimeout(fn, ms);
    };

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented || disabled || inFlight.current || (!href && !onDownload)) return;
      inFlight.current = true;
      if (timerRef.current !== null) globalThis.clearTimeout(timerRef.current);
      setError("");
      setPhase("downloading");
      try {
        if (onDownload) await onDownload();
        if (href) {
          const anchor = document.createElement("a");
          anchor.href = href;
          if (download) anchor.download = safeDownloadName(download);
          anchor.rel = "noopener";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        }
        // A browser exposes the handoff, not confirmation that a file was saved.
        if (mounted.current) {
          setPhase("done");
          schedule(() => { if (mounted.current) setPhase("idle"); }, resetMs);
        }
      } catch (cause) {
        if (mounted.current) { setPhase("idle"); setError("Download could not be started. Try again."); }
        onDownloadError?.(cause);
      } finally { inFlight.current = false; }
    };

    const idle = phase === "idle";
    const downloading = phase === "downloading";
    const done = phase === "done";

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || downloading || (!href && !onDownload)}
        aria-label={props["aria-label"] || label}
        data-slot="download-button"
        data-phase={phase}
        aria-busy={downloading || undefined}
        onClick={handleClick}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg px-4 font-sans text-sm font-medium outline-none select-none",
          "transition-[background-color,box-shadow,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
          // Soft 3D key; sinks in while pressed or downloading.
          "shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.08)]",
          downloading &&
            "shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(0,0,0,0.04),inset_0_-1px_2px_rgba(0,0,0,0.05)]",
          idle &&
            "cursor-pointer bg-neutral-50 text-neutral-700 hover:text-neutral-900 active:bg-neutral-100 active:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(0,0,0,0.04),inset_0_-1px_2px_rgba(0,0,0,0.05)]",
          downloading && "cursor-default bg-neutral-100 text-neutral-500",
          // Done: emerald 3D key — soft sheen + deep lift (no hard white rim).
          done &&
            "cursor-pointer bg-emerald-600 text-white shadow-[0_1px_1px_rgba(0,0,0,0.25),0_3px_6px_rgba(0,0,0,0.2),0_6px_12px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(255,255,255,0.22),inset_0_-3px_6px_rgba(0,0,0,0.35)]",
          "zipora-download",
          className,
        )}
        {...props}
      >
        <span className="sr-only" aria-live="polite">
          {error || (downloading ? downloadingLabel : done ? doneLabel : "")}
        </span>

        {/* Fixed icon slot keeps the icon and label aligned in every phase. */}
        <span className="relative size-4 shrink-0">
          <span
            aria-hidden
            className={cn(ICON_LAYER, idle ? "opacity-100" : "opacity-0")}
          >
            <ArrowDownToLine size={15} strokeWidth={2} />
          </span>
          <span
            aria-hidden
            className={cn(
              ICON_LAYER,
              downloading ? "opacity-100" : "opacity-0",
            )}
          >
            <Loader2
              size={15}
              strokeWidth={2}
              className="animate-spin motion-reduce:animate-none"
            />
          </span>
          <span
            aria-hidden
            className={cn(ICON_LAYER, done ? "opacity-100" : "opacity-0")}
          >
            <Check size={15} strokeWidth={2.5} />
          </span>
        </span>

        <span className="grid">
          <span
            aria-hidden={!idle}
            className={cn(
              LABEL_LAYER,
              idle
                ? "opacity-100 delay-200 duration-300"
                : "opacity-0 duration-200",
            )}
          >
            {label}
          </span>
          <span
            aria-hidden={!downloading}
            className={cn(
              LABEL_LAYER,
              downloading
                ? "opacity-100 delay-200 duration-300"
                : "opacity-0 duration-200",
            )}
          >
            {downloadingLabel}
          </span>
          <span
            aria-hidden={!done}
            className={cn(
              LABEL_LAYER,
              done
                ? "opacity-100 delay-200 duration-300"
                : "opacity-0 duration-200",
            )}
          >
            {doneLabel}
          </span>
        </span>
      </button>
    );
  },
);

DownloadButton.displayName = "DownloadButton";
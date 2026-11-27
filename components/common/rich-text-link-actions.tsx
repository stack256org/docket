"use client";

import {
  autoUpdate,
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { ArrowSquareOutIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const HIDE_DELAY_MS = 150;

/** What "Copy" yields: the address itself, without a mailto:/tel: scheme. */
function copyValue(href: string): string {
  return href.replace(/^(mailto|tel):/i, "");
}

async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }
  // Self-hosted installs are often served over plain http on a LAN, where the
  // async Clipboard API doesn't exist — fall back to a hidden textarea.
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    el.remove();
  }
}

/** Hover/focus card for links inside rendered rich text, offering Copy and
 * Open. Listens on `container` via event delegation because the links are
 * rendered by Tiptap, not React. Clicking the link itself still opens it. */
export function RichTextLinkActions({
  container,
}: {
  container: HTMLElement | null;
}) {
  const [anchor, setAnchor] = useState<HTMLAnchorElement | null>(null);
  const [copied, setCopied] = useState(false);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<number | null>(null);

  const { floatingStyles, refs } = useFloating({
    elements: { reference: anchor },
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    open: anchor !== null,
    placement: "top-start",
    whileElementsMounted: autoUpdate,
  });

  const cancelHide = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    cancelHide();
    anchorRef.current = null;
    setAnchor(null);
    setCopied(false);
  }, [cancelHide]);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = window.setTimeout(hide, HIDE_DELAY_MS);
  }, [cancelHide, hide]);

  const show = useCallback(
    (link: HTMLAnchorElement) => {
      cancelHide();
      if (anchorRef.current !== link) {
        anchorRef.current = link;
        setAnchor(link);
        setCopied(false);
      }
    },
    [cancelHide]
  );

  useEffect(() => {
    if (!container) {
      return;
    }
    const root = container;
    const linkFrom = (target: EventTarget | null) =>
      target instanceof Element
        ? target.closest<HTMLAnchorElement>("a[href]")
        : null;
    const inCard = (node: EventTarget | null) =>
      node instanceof Node && (cardRef.current?.contains(node) ?? false);

    function onOver(event: MouseEvent) {
      const link = linkFrom(event.target);
      if (link && root.contains(link)) {
        show(link);
      }
    }
    function onOut(event: MouseEvent) {
      const link = linkFrom(event.target);
      if (!link) {
        return;
      }
      const to = event.relatedTarget;
      if ((to instanceof Node && link.contains(to)) || inCard(to)) {
        return;
      }
      scheduleHide();
    }
    function onFocusIn(event: FocusEvent) {
      const link = linkFrom(event.target);
      if (link && root.contains(link)) {
        show(link);
      }
    }
    function onFocusOut(event: FocusEvent) {
      if (!inCard(event.relatedTarget)) {
        scheduleHide();
      }
    }

    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseout", onOut);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseout", onOut);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, [container, show, scheduleHide]);

  useEffect(() => {
    if (!anchor) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        hide();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [anchor, hide]);

  useEffect(() => cancelHide, [cancelHide]);

  if (!anchor) {
    return null;
  }

  const href = anchor.getAttribute("href") ?? anchor.href;
  const display = copyValue(href);

  async function handleCopy() {
    if (await copyText(display)) {
      setCopied(true);
    } else {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <FloatingPortal>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: transient card that bridges a link and its Copy/Open buttons — the handlers only keep it open while the pointer or focus moves between them (keyboard users still get the link itself, which opens on Enter) */}
      <div
        aria-label="Link actions"
        className="z-50 flex max-w-[min(24rem,calc(100vw-1rem))] items-center gap-1 rounded-field border border-base-300 bg-base-100 py-1 pr-1 pl-2.5 shadow-md"
        onBlur={(event) => {
          if (!inCardOrAnchor(event.relatedTarget, cardRef.current, anchor)) {
            scheduleHide();
          }
        }}
        onFocus={cancelHide}
        onMouseEnter={cancelHide}
        onMouseLeave={scheduleHide}
        ref={(el) => {
          cardRef.current = el;
          refs.setFloating(el);
        }}
        role="toolbar"
        style={floatingStyles}
      >
        <span
          className="min-w-0 flex-1 truncate text-xs text-base-content-muted"
          title={display}
        >
          {display}
        </span>
        <Button
          aria-label={copied ? "Link copied" : "Copy link"}
          onClick={handleCopy}
          size="xs"
          type="button"
          variant="ghost"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button asChild size="xs" variant="ghost">
          <a
            aria-label="Open link in a new tab"
            href={href}
            rel="noopener noreferrer nofollow"
            target="_blank"
          >
            <ArrowSquareOutIcon />
            Open
          </a>
        </Button>
      </div>
    </FloatingPortal>
  );
}

function inCardOrAnchor(
  node: EventTarget | null,
  card: HTMLElement | null,
  anchor: HTMLElement
): boolean {
  return (
    node instanceof Node &&
    ((card?.contains(node) ?? false) || anchor.contains(node))
  );
}

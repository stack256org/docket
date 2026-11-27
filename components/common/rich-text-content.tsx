"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  baseRichTextExtensions,
  parseRichTextContent,
} from "./rich-text-extensions";
import { RichTextLinkActions } from "./rich-text-link-actions";
import { linkifyRichTextContent } from "./rich-text-linkify";

interface Props {
  className?: string;
  content: string;
}

/** Read-only renderer for reply content stored as Tiptap JSON. Going through a
 * non-editable Tiptap instance rather than raw HTML means only known nodes are
 * produced, so customer content can't inject markup. Legacy plain text becomes
 * one paragraph per line. Bare URLs are linkified for display, and links get a
 * Copy/Open card on hover or focus. */
export function RichTextContent({ content, className }: Props) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const editor = useEditor({
    editable: false,
    extensions: baseRichTextExtensions(),
    content: linkifyRichTextContent(content),
    editorProps: {
      attributes: {
        class: cn("tiptap-content focus:outline-none", className),
      },
    },
    immediatelyRender: false,
  });

  if (!editor) {
    // SSR / first paint fallback so text is visible before hydration.
    return (
      <div className={cn("tiptap-content whitespace-pre-wrap", className)}>
        {parseRichTextContent(content) === content ? content : ""}
      </div>
    );
  }

  return (
    // `contents` keeps the wrapper out of layout; it only exists so the link
    // card can listen for hover/focus on links Tiptap renders.
    <div className="contents" ref={setContainer}>
      <EditorContent editor={editor} />
      <RichTextLinkActions container={container} />
    </div>
  );
}

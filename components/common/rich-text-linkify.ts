import { find } from "linkifyjs";
import { parseRichTextContent } from "./rich-text-extensions";

interface RichTextMark {
  attrs?: Record<string, unknown>;
  type: string;
}

interface RichTextNode {
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
  type?: string;
}

// Every link in a conversation opens in a new tab so the reader keeps the ticket.
const LINK_ATTRS = { rel: "noopener noreferrer nofollow", target: "_blank" };

// Mirrors Tiptap autolink's default: a bare IPv4 address without a scheme
// is not treated as a link.
const BARE_IPV4 = /^\d{1,3}(\.\d{1,3}){3}(?:[/:?#]|$)/;

function withLinkAttrs(marks: RichTextMark[]): RichTextMark[] {
  return marks.map((mark) =>
    mark.type === "link"
      ? { ...mark, attrs: { ...mark.attrs, ...LINK_ATTRS } }
      : mark
  );
}

function linkifyText(node: RichTextNode): RichTextNode[] {
  const text = node.text ?? "";
  const marks = withLinkAttrs(node.marks ?? []);
  // Already a link, or inline code (a URL in code is meant literally).
  if (!text || marks.some((m) => m.type === "link" || m.type === "code")) {
    return [{ ...node, marks: node.marks ? marks : undefined }];
  }

  const matches = find(text).filter(
    (match) => match.isLink && !BARE_IPV4.test(match.value)
  );
  if (matches.length === 0) {
    return [node];
  }

  const out: RichTextNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) {
      out.push({ ...node, text: text.slice(cursor, match.start) });
    }
    out.push({
      ...node,
      marks: [
        ...marks,
        {
          attrs: { class: null, href: match.href, ...LINK_ATTRS },
          type: "link",
        },
      ],
      text: match.value,
    });
    cursor = match.end;
  }
  if (cursor < text.length) {
    out.push({ ...node, text: text.slice(cursor) });
  }
  return out;
}

function walk(node: RichTextNode): RichTextNode {
  // Code blocks are literal — leave URLs in them alone.
  if (node.type === "codeBlock" || !Array.isArray(node.content)) {
    return node;
  }
  return {
    ...node,
    content: node.content.flatMap((child) =>
      child.type === "text" ? linkifyText(child) : [walk(child)]
    ),
  };
}

/** Turns stored ticket/reply content into a Tiptap document for display with
 * every bare URL or email address wrapped in a link mark. Done at render time
 * rather than on save so it covers everything already stored: legacy plain-text
 * rows, API/Zammad imports, and URLs Tiptap's autolink missed because nothing
 * was typed after them (it only links once whitespace follows). */
export function linkifyRichTextContent(content: string): RichTextNode {
  const parsed = parseRichTextContent(content);
  if (typeof parsed === "string") {
    // Legacy plain text: one paragraph per line, as plain text nodes (never
    // parsed as HTML).
    return walk({
      content: parsed.split(/\r\n|\r|\n/).map((line) => ({
        content: line ? [{ text: line, type: "text" }] : [],
        type: "paragraph",
      })),
      type: "doc",
    });
  }
  return walk(parsed as RichTextNode);
}

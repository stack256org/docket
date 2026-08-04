import StarterKit from "@tiptap/starter-kit";

// Shared Tiptap extension set used by both the editable reply editor and the
// read-only reply renderer, so composed content always renders identically.
// StarterKit (v3) bundles Link + Underline, so we configure them here rather
// than registering duplicates.
export function baseRichTextExtensions() {
  return [
    StarterKit.configure({
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      },
    }),
  ];
}

/** Parse stored reply content (Tiptap JSON) into editor content, tolerating legacy plain text. */
export function parseRichTextContent(value: string): object | string {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) {
    return value;
  }
  try {
    return JSON.parse(trimmed) as object;
  } catch {
    return value;
  }
}

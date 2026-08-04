import { describe, expect, it } from "vitest";
import {
  isRichTextEmpty,
  richTextToPlainText,
  textToRichTextJson,
} from "@/lib/rich-text";

// Replies are stored as Tiptap JSON. Anything that puts a reply into a text
// context (email bodies, push notifications, list previews) has to flatten it
// first. Getting this wrong means customers receive a wall of raw JSON.

const doc = (text: string) =>
  JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });

describe("richTextToPlainText", () => {
  it("extracts the text from a Tiptap document", () => {
    expect(richTextToPlainText(doc("Hello there"))).toBe("Hello there");
  });

  it("never returns anything that looks like raw JSON", () => {
    // The failure this guards against: an email that reads
    // {"type":"doc","content":[...]} instead of the customer's message.
    const out = richTextToPlainText(doc("Hello"));
    expect(out).not.toContain('"type"');
    expect(out).not.toContain("paragraph");
    expect(out.startsWith("{")).toBe(false);
  });

  it("walks nested marks and multiple blocks", () => {
    const nested = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold ", marks: [{ type: "bold" }] },
            { type: "text", text: "and plain" },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "an item" }],
                },
              ],
            },
          ],
        },
      ],
    });
    const out = richTextToPlainText(nested);
    expect(out).toContain("Bold and plain");
    expect(out).toContain("an item");
  });

  it("passes legacy plain-text rows through unchanged", () => {
    // Content written before the editor existed is stored as a bare string.
    expect(richTextToPlainText("just a string")).toBe("just a string");
  });

  it("does not throw on malformed JSON", () => {
    expect(() => richTextToPlainText('{"type":"doc"')).not.toThrow();
    expect(() => richTextToPlainText("{}")).not.toThrow();
    expect(() => richTextToPlainText("")).not.toThrow();
  });
});

describe("isRichTextEmpty", () => {
  it("treats an empty document as empty", () => {
    expect(isRichTextEmpty(JSON.stringify({ type: "doc", content: [] }))).toBe(
      true
    );
  });

  it("treats a document containing only whitespace as empty", () => {
    expect(isRichTextEmpty(doc("   "))).toBe(true);
  });

  it("treats a blank legacy string as empty", () => {
    expect(isRichTextEmpty("")).toBe(true);
    expect(isRichTextEmpty("   \n  ")).toBe(true);
  });

  it("treats real content as not empty", () => {
    expect(isRichTextEmpty(doc("Hello"))).toBe(false);
    expect(isRichTextEmpty("legacy text")).toBe(false);
  });
});

describe("textToRichTextJson", () => {
  it("produces a document that flattens back to the original text", () => {
    const original = "First line\nSecond line";
    expect(richTextToPlainText(textToRichTextJson(original))).toContain(
      "First line"
    );
    expect(richTextToPlainText(textToRichTextJson(original))).toContain(
      "Second line"
    );
  });

  it("produces valid Tiptap JSON", () => {
    const parsed = JSON.parse(textToRichTextJson("Hello"));
    expect(parsed.type).toBe("doc");
    expect(Array.isArray(parsed.content)).toBe(true);
  });

  it("does not interpret input as markup", () => {
    // Public API callers send arbitrary text; it must land as literal
    // characters, not as a node the renderer will treat specially.
    const out = richTextToPlainText(
      textToRichTextJson("<script>alert(1)</script>")
    );
    expect(out).toBe("<script>alert(1)</script>");
  });
});

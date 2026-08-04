import { createId } from "@paralleldrive/cuid2";

/**
 * Stable React keys for lists of pending `File` objects (attachment pickers).
 *
 * The index is not usable as a key here: these lists are removable, and removing
 * a middle entry shifts every index after it, so React re-associates the wrong
 * row with the wrong file. A composite of name/size/lastModified isn't safe
 * either — the file picker happily lets someone add the same file twice, which
 * would produce duplicate keys.
 *
 * Keying on the `File` object's own identity sidesteps both. The WeakMap holds
 * the association only as long as the File is still referenced by component
 * state, so nothing leaks once the form is submitted or cleared.
 */
const keys = new WeakMap<File, string>();

export function fileKey(file: File): string {
  let key = keys.get(file);
  if (!key) {
    key = createId();
    keys.set(file, key);
  }
  return key;
}

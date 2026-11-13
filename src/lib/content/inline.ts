/**
 * Editorial inline text -> HTML. Supports exactly two marks: **strong** and *emphasis*.
 * Everything else is escaped, so editorial content can never inject markup.
 */
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Plain text (marks removed), e.g. for search indexes and attributes. */
export const plain = (text: string): string => text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

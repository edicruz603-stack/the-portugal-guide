/** How the editorial parity check reads a page (shared by scripts/check-parity.mjs and the register draft tool). */
export const decode = (s: string) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
/** The page body between the shared header and footer. */
export const region = (html: string) => html.slice(html.indexOf('</header>') + 9, html.indexOf('<footer'));
/** Visible text: scripts and styles removed, tags stripped, entities decoded, whitespace collapsed. */
export const strip = (html: string) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

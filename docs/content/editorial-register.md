# Approved editorial changes register

File: `src/content/editorial-changes.yaml` · code: `src/lib/editorial/register.ts` · checked by `npm run test:parity` and validator rule C14.

The website must say exactly what the frozen legacy pages say (root `*.html`), except where the owner has approved a change. Every intentional visible change is one register entry:

| Field | Meaning |
|---|---|
| `id` | `change.<destination>.<key>`, unique |
| `page` | one of the five parity pages |
| `content_id` | the record the change is about (place, fact, event, image …), or `page:<file>` for page prose |
| `kind` | `text` (visible text) or `image` (`src \| alt` pair) |
| `before` / `after` | the previous and the replacement content. Text is compared as parity sees it: tags stripped, entities decoded, whitespace collapsed to single spaces |
| `reason` | why the change was made |
| `approval` | `ref` (where the owner approved it) and `date` |

How the check works:
- For each page, parity applies only that page's entries to the legacy text and then requires legacy and new to be identical.
- An entry fails if its `before` does not occur **exactly once** in the legacy page (stale or ambiguous), or its `after` is not on the new page (approving a change that did not happen).
- Every entry must be applied somewhere, so unused entries fail too.
- There are no wildcard or blanket exclusions. Anything not registered fails as before.
- Ended events are still cut from the legacy side by date (M2 rule), and the footer tagline exception from Phase 1 is unchanged.

Adding an entry: make the change, run the build and `npm run test:parity`, copy the exact before/after text from the parity output, record the owner's approval reference, and run parity again.

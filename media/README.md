# Media: owner photographs

```
media/
  intake/<batch>.yaml        what was received (schema: src/lib/media/intake.ts; checked by rule C18)
  originals/<batch>/<file>   original files exactly as exported by the owner, when they are accessible to the build
```

- **Owner = declared photographer and rights holder** (batch `declaration`, 16 Nov 2026). Earlier statements that qualify it are kept in `declaration.history`.
- **Originals vs derivatives.** `original.state` is `supplied-not-accessible` when the owner supplied the photo but only a reduced copy reached the workspace, or `accessible` (with path and SHA-256). A missing original is never read as "not supplied". `preview` is that reduced copy (size, SHA-256, metadata). `derivatives` are files kept in the repository (path, size, SHA-256, edits); their hashes are checked on every validation run.
- **Separate assessments:** `subject` (visual / owner-confirmed / not-identified), `authorship` (owner-declared, or owner-to-reconfirm *with documented evidence*), `people`, `marks` (trademarks and signage), `property` (the operator image rule of a depicted site, and any authorisation).
- **Commercial blockers** are only the documented issues listed by `commercialBlockers()`; see `docs/content/image-rights.md`.
- Capture dates, places, devices and captions are never invented.

Batches: `2026-11-06-owner-sintra` (11), `2026-11-07-owner-sintra` (11, one duplicate), `2026-11-16-owner-sintra` (19). No original or derivative is stored in the repository yet.

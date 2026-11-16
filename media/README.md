# Media: owner photographs

```
media/
  intake/<batch>.yaml        manifest of what was received (schema: src/lib/media/intake.ts; checked by rule C18)
  originals/<batch>/<file>   original files exactly as supplied by the owner (never edited, cropped or re-encoded)
```

- **Originals are read-only.** They are never overwritten or modified. Website images are *derivatives* generated from an original (resized/encoded) and stored separately, only when a page needs them.
- **Previews are not originals.** Images received in a conversation are downscaled copies without camera metadata. They are catalogued (dimensions and SHA-256) but not stored here or used on the site.
- **Status per photo:** `awaiting-original` → `original-received` (with path, SHA-256 and date) → optionally `rejected`.
- **Subjects** are proposals until the owner confirms them (`confirmed_subject`). A photo is never used where its subject matters until confirmed. Capture dates, places, camera data and captions are never invented; they come from the original's metadata or from the owner.
- **People and signage** are noted per photo. Photos with identifiable people are not published in a way that raises avoidable privacy concerns.
- An `images.json` record for an owner photograph needs `rights_category: owner` and an `intake` reference to a received original with a confirmed subject (rule C18). Commercial use also needs `commercial_basis: owner-original` and a `permission_ref` to the written ownership/permission record.

Current batch: `intake/2026-11-16-owner-sintra.yaml`, 19 photos, all `awaiting-original`.

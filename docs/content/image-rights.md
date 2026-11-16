# Image rights and owner photography (M3)

## The four commercial blockers (audit, 16 Nov 2026)

| Image | Recorded author · licence (from the legacy caption) | Commons page inspected? | Commercial basis | Owner replacement available? |
|---|---|---|---|---|
| `img.sintra.wm-pena-palace` | Pakycassano · CC BY-SA 4.0 | **No** (not reachable from the build workspace) | none (`commercial_ok: false`) | No: none of the 19 owner photos shows Pena |
| `img.sintra.wm-regaleira-well` | Husond · CC BY-SA 3.0 | **No** | none | No (Initiation Well) |
| `img.sintra.wm-moorish-castle` | Ввласенко · CC BY-SA 3.0 | **No** | none | No (Moorish Castle) |
| `img.sintra.wm-monserrate` | nborges · CC BY 2.0 (Flickr) | **No** | none | No (Monserrate) |

The free edition keeps showing them with their credits (warning W06). The commercial build stays blocked (C11) and cannot be unblocked without a recorded basis (C18).

## Clearance workflow (per image)
1. **Verify the licence on the actual file page** (a person with a browser): licence template verbatim, author and requested attribution, any dual licence, upload date, Flickr licence review for transfers, and warning templates (personality rights, freedom of panorama, trademarks).
2. Record `licence_url`, `licence_verified_on` and the exact attribution (title, author, source, licence). Set `status: verified`.
3. **Share-alike** (CC BY-SA): an unchanged photo inside the guide is generally treated as a collection. A crop or edit is an adaptation that must be released under the same licence. Record whether the image is modified.
4. **A licence is not a full clearance.** CC licences cover copyright only. Property or site photography rules, personality rights, trademarks and moral rights are separate. Attribution alone never makes `commercial_ok: true`: rule C18 requires `commercial_basis` with its supporting fields.
5. Prefer **owner photographs** for the paid edition (`commercial_basis: owner-original`). These need a received original, a confirmed subject and a written ownership/permission record (`permission_ref`).

## Replacing an image (audit trail)
- Add a new `images.json` record for the replacement. Keep the old record, linked by `replaces` / `replaced_by`.
- Update the credit, alt text and page references in one PR.
- Record the visible change (`kind: image`) in the editorial changes register.

## Owner photographs received 16 Nov 2026
`media/intake/2026-11-16-owner-sintra.yaml` catalogues 19 photos. **They arrived as downscaled previews**: longest side 2576 px, camera metadata removed, sender file names `1000077308.jpg`–`1000077326.jpg`. They are not stored in the repository.

| Proposed subject (unconfirmed) | Photos |
|---|---|
| National Palace of Sintra seen from above (two conical chimneys; viewpoint not identified) | 1000077318–1000077326 (9) |
| House named "Villa Nogueiras" (tile sign; location not established) | 1000077316, 1000077317 |
| Streets and lanes, no place identified | 1000077313, 1000077314, 1000077315 |
| Streets with shop/café signage (Artnis, Lord Byron café, Ginjinha, Cintra Antiga, Ginja Mariquinhas) | 1000077308, 1000077309, 1000077311, 1000077312; 1000077310 also shows a few small, distant figures (review on the original) |

**Needed from the owner:**
1. The 19 **original files**, exported without compression (full resolution, with metadata).
2. Confirmation of each photo's subject.
3. A written ownership/permission statement.
4. Photographs of Pena, the Regaleira Initiation Well, the Moorish Castle and Monserrate if those four are to be replaced. Otherwise the Commons licences can be verified, or the images removed from a commercial edition.

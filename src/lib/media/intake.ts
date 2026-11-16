/**
 * Owner photograph intake (M3, corrected at M3 closure, 16 Nov 2026).
 *
 * Manifests live in media/intake/<batch>.yaml. Each entry separates:
 *   - the ORIGINAL (the photographer's own file): supplied by the owner, but possibly not accessible to the build
 *     workspace. A missing original is never treated as proof that it was not supplied;
 *   - the accessible DERIVATIVE (`preview`): the reduced copy that reached the workspace, identified by SHA-256;
 *   - stored DERIVATIVES (`derivatives`): files in the repository made from the preview or the original, each with
 *     its own SHA-256 so integrity can be checked whenever the file is present;
 *   - AUTHORSHIP: the owner is the declared photographer and rights holder (batch declaration). A file is marked
 *     `owner-to-reconfirm` only with documented evidence; it is never reclassified as third-party;
 *   - SUBJECT, PEOPLE, MARKS (trademarks/signage) and PROPERTY (capture location vs operators' internal rules) are
 *     assessed separately.
 */
import { z } from 'zod';
import { isoDate } from '../content/schemas.ts';

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const filename = z.string().regex(/^[\w.-]+\.(jpe?g|png|heic|webp)$/i);

export const OriginalState = z.enum([
  'supplied-not-accessible', // the owner supplied it; only a reduced derivative reached this workspace
  'accessible',              // the original file is stored (media/originals/...) and its hash recorded
]);

export const IntakePhotoSchema = z.object({
  sender_filename: filename,
  /** reference in an earlier register (e.g. Registers First Edition v0.8: O-06, N-01) */
  legacy_ref: z.string().min(1).optional(),
  /** same bytes as another received file: its intake ref (`<batch>/<sender_filename>`) */
  duplicate_of: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\/[\w.-]+$/).optional(),
  original: z.object({
    state: OriginalState,
    path: z.string().regex(/^media\/originals\//).optional(),
    sha256: sha256.optional(),
    note: z.string().min(10).optional(),
  }).strict(),
  /** the copy accessible in the workspace: a reduced derivative, never treated as the original */
  preview: z.object({
    kind: z.literal('reduced-derivative'),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    sha256,
    received_on: isoDate,
    /** camera metadata in the accessible copy; with none, capture date/place/device are unverified */
    metadata: z.enum(['none', 'reduced', 'present']),
  }).strict(),
  /** files kept in the repository, made from the preview or the original */
  derivatives: z.array(z.object({
    path: z.string().regex(/^(public|media)\//),
    from: z.enum(['preview', 'original']),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    sha256,
    edits: z.string().min(2),
  }).strict()).optional(),
  description: z.string().min(10),
  subject: z.object({
    text: z.string().min(3),
    /** visual = identified from the image by the editors; owner-confirmed = stated by the owner for this file */
    identification: z.enum(['visual', 'owner-confirmed', 'not-identified']),
    basis: z.string().min(3),
  }).strict(),
  authorship: z.object({
    status: z.enum(['owner-declared', 'owner-to-reconfirm']),
    /** required for owner-to-reconfirm: the documented reason (never an assumption) */
    evidence: z.string().min(10).optional(),
  }).strict(),
  people: z.object({ assessment: z.enum(['none-visible', 'not-identifiable', 'identifiable']), note: z.string().optional() }).strict(),
  marks: z.object({ assessment: z.enum(['none', 'present']), note: z.string().optional() }).strict(),
  /**
   * Where the photo was taken, relative to a managed site it depicts (owner decision, 16 Nov 2026: public-space
   * photography). An operator's internal image rules (e.g. the Parques de Sintra regulation) apply ONLY when there is
   * evidence that the photo was captured inside that operator's premises (`capture: inside`, with `evidence` and the
   * `rule`). A photo taken from a public street, road or square is not restricted because a monument appears in it.
   * An unknown capture location is recorded as unknown and never assumed to be inside.
   */
  property: z.object({
    /** the managed site shown in the photo (information only; not a restriction by itself) */
    depicts_site: z.string().min(2).optional(),
    capture: z.enum(['inside', 'outside', 'unknown']),
    /** what shows where the photo was taken; required for `inside` */
    evidence: z.string().min(10).optional(),
    /** the operator's internal rule; only for photos captured inside its premises */
    rule: z.string().regex(/^src\./).optional(),
    authorisation_ref: z.string().min(5).optional(),
    note: z.string().min(5),
  }).strict(),
  capture: z.string().min(2),
  use: z.enum(['catalogued', 'candidate', 'in-use', 'held', 'not-suitable']),
  note: z.string().optional(),
}).strict()
  .refine((p) => p.original.state !== 'accessible' || (!!p.original.path && !!p.original.sha256), { message: 'an accessible original needs path and sha256' })
  .refine((p) => p.authorship.status !== 'owner-to-reconfirm' || !!p.authorship.evidence, { message: 'owner-to-reconfirm needs documented evidence' })
  .refine((p) => !p.property.rule || p.property.capture === 'inside', { message: 'an operator\'s internal rule applies only to photos captured inside its premises' })
  .refine((p) => p.property.capture !== 'inside' || (!!p.property.depicts_site && !!p.property.evidence && !!p.property.rule), { message: 'capture inside needs the site, the evidence and the rule' });

export const IntakeBatchSchema = z.object({
  batch: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/),
  received_via: z.string().min(2),
  declaration: z.object({
    photographer: z.literal('owner'),
    rights_holder: z.literal('owner'),
    stated_on: isoDate,
    ref: z.string().min(10),
    /** earlier statements that qualify the declaration, kept verbatim in substance */
    history: z.array(z.object({ on: isoDate, statement: z.string().min(10) }).strict()).optional(),
  }).strict(),
  photos: z.array(IntakePhotoSchema).min(1),
}).strict();
export type IntakeBatch = z.infer<typeof IntakeBatchSchema>;
export type IntakePhoto = z.infer<typeof IntakePhotoSchema>;

/** `<batch>/<sender_filename>` as used by images.json `intake`. */
export const intakeRef = (b: { batch: string }, p: { sender_filename: string }) => `${b.batch}/${p.sender_filename}`;

/**
 * Genuine, documented reasons why an owner photograph cannot yet be used commercially. Empty = no blocker.
 * Not blockers: a reduced derivative, missing camera metadata, an original not accessible here, or incidental
 * shop signage (recorded under `marks` for the editor's judgement).
 */
export function commercialBlockers(p: IntakePhoto): string[] {
  const out: string[] = [];
  if (p.authorship.status === 'owner-to-reconfirm') out.push(`authorship to reconfirm: ${p.authorship.evidence}`);
  if (p.subject.identification === 'not-identified') out.push('subject not identified');
  if (p.people.assessment === 'identifiable') out.push('identifiable people: consent, crop or replacement needed');
  // only with evidence of capture inside the premises; outside or unknown is never a blocker on this ground
  if (p.property.capture === 'inside' && p.property.rule && !p.property.authorisation_ref) out.push(`captured inside ${p.property.depicts_site} (${p.property.evidence}): the operator's internal rule ${p.property.rule} requires its authorisation for commercial or public use; none recorded`);
  return out;
}

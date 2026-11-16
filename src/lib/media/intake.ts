/**
 * Owner photograph intake (M3). Manifests live in media/intake/<batch>.yaml; original files, when supplied,
 * go to media/originals/<batch>/ and are never edited. Website derivatives are made from originals only.
 */
import { z } from 'zod';
import { isoDate } from '../content/schemas.ts';

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);

export const IntakePhotoSchema = z.object({
  sender_filename: z.string().min(1),
  status: z.enum(['awaiting-original', 'original-received', 'rejected']),
  /** what was received in the conversation (a downscaled preview, never used as an original) */
  preview: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), sha256 }).strict().optional(),
  original: z.object({ path: z.string().regex(/^media\/originals\//), sha256, received_on: isoDate }).strict().optional(),
  description: z.string().min(10),
  proposed_subject: z.object({ text: z.string().min(3), basis: z.string().min(3), confirmed: z.boolean() }).strict(),
  /** set only when the owner confirms what the photo shows */
  confirmed_subject: z.object({ text: z.string().min(3), confirmed_on: isoDate, by: z.string().min(2) }).strict().optional(),
  people: z.string().min(2),
  signage: z.string().min(2),
  capture: z.string().min(2),
  note: z.string().optional(),
}).strict()
  .refine((p) => (p.status === 'original-received') === !!p.original, { message: 'original-received if and only if the original file is recorded' })
  .refine((p) => p.proposed_subject.confirmed === !!p.confirmed_subject, { message: 'proposed_subject.confirmed must match confirmed_subject' })
  .refine((p) => !p.confirmed_subject || p.status === 'original-received', { message: 'a subject is confirmed only on a received original' });

export const IntakeBatchSchema = z.object({
  batch: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/),
  owner: z.string().min(2),
  received_on: isoDate,
  received_via: z.string().min(2),
  rights_statement: z.string().min(10),
  photos: z.array(IntakePhotoSchema).min(1),
}).strict();
export type IntakeBatch = z.infer<typeof IntakeBatchSchema>;

/** `<batch>/<sender_filename>` as used by images.json `intake`. */
export const intakeRef = (b: { batch: string }, p: { sender_filename: string }) => `${b.batch}/${p.sender_filename}`;

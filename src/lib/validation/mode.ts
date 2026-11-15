/**
 * Publication-mode contract (M2 review fix).
 *
 *   free        the current website edition: uncleared images are warnings (unchanged behaviour)
 *   commercial  a paid/commercial release: uncleared images, and every other critical rule, block the build
 *
 * The mode comes from `--mode=<value>` (validator CLI) and/or the PUBLICATION_MODE environment variable
 * (validator CLI and `astro build`). Rules:
 *   - nothing given            -> free (the default is printed, never silent)
 *   - an unknown value         -> error (a typo can never fall back to free)
 *   - both given and different -> error
 */
export const MODES = ['free', 'commercial'] as const;
export type PublicationMode = (typeof MODES)[number];

export class PublicationModeError extends Error {}

export interface ResolvedMode { mode: PublicationMode; origin: 'default' | 'argument' | 'environment' | 'argument+environment' }

export function resolvePublicationMode(argv: readonly string[], env: Record<string, string | undefined>): ResolvedMode {
  const parse = (raw: string, where: string): PublicationMode => {
    const v = raw.trim().toLowerCase();
    if (!(MODES as readonly string[]).includes(v)) throw new PublicationModeError(`Unknown publication mode "${raw}" in ${where}. Use one of: ${MODES.join(', ')}.`);
    return v as PublicationMode;
  };
  const args = argv.filter((a) => a === '--mode' || a.startsWith('--mode=') || a === '--production');
  if (args.includes('--production')) throw new PublicationModeError('"--production" is not a publication mode. Use --mode=free or --mode=commercial.');
  if (args.includes('--mode')) throw new PublicationModeError('Use --mode=<free|commercial>.');
  const fromArg = args.length ? parse(args[args.length - 1]!.slice('--mode='.length), '--mode') : undefined;
  const fromEnv = env.PUBLICATION_MODE !== undefined && env.PUBLICATION_MODE !== '' ? parse(env.PUBLICATION_MODE, 'PUBLICATION_MODE') : undefined;
  if (fromArg && fromEnv && fromArg !== fromEnv) throw new PublicationModeError(`--mode=${fromArg} contradicts PUBLICATION_MODE=${fromEnv}.`);
  if (fromArg && fromEnv) return { mode: fromArg, origin: 'argument+environment' };
  if (fromArg) return { mode: fromArg, origin: 'argument' };
  if (fromEnv) return { mode: fromEnv, origin: 'environment' };
  return { mode: 'free', origin: 'default' };
}

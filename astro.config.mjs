// @ts-check
import { defineConfig } from 'astro/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Host-independent static build.
// SITE and BASE can be overridden for another host without code changes.
const site = process.env.SITE_URL ?? 'https://edicruz603-stack.github.io';
const base = process.env.BASE_PATH ?? '/the-portugal-guide';

/**
 * Content validation is part of every build, however it is started (`npm run build`, `npx astro build`, CI).
 * The publication mode comes from PUBLICATION_MODE (default free). Any critical issue — in commercial mode
 * including uncleared images — or an invalid mode stops the build before pages are generated.
 * `astro dev` is not affected.
 */
const contentValidation = {
  name: 'tpg-content-validation',
  hooks: {
    'astro:build:start': () => {
      const script = fileURLToPath(new URL('./scripts/validate-content.ts', import.meta.url));
      const r = spawnSync(process.execPath, ['--experimental-strip-types', script], { stdio: 'inherit', env: process.env });
      if (r.status !== 0) throw new Error(`Content validation failed (exit ${r.status}); build stopped.`);
    },
  },
};

export default defineConfig({
  site,
  base,
  // 'file' keeps the legacy URLs identical: /sintra.html, /sintra-romantic-guide.html …
  build: { format: 'file' },
  trailingSlash: 'ignore',
  output: 'static',
  integrations: [contentValidation],
});

// @ts-check
import { defineConfig } from 'astro/config';

// Host-independent static build.
// SITE and BASE can be overridden for another host without code changes.
const site = process.env.SITE_URL ?? 'https://edicruz603-stack.github.io';
const base = process.env.BASE_PATH ?? '/the-portugal-guide';

export default defineConfig({
  site,
  base,
  // 'file' keeps the legacy URLs identical: /sintra.html, /sintra-romantic-guide.html …
  build: { format: 'file' },
  trailingSlash: 'ignore',
  output: 'static',
  // Phase 0/1: no telemetry, no integrations that call external services.
});

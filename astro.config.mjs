// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import settings from './src/data/settings.json' with { type: 'json' };

// The website address is set in src/data/settings.json ("siteUrl"),
// which can be edited from the admin panel.
export default defineConfig({
  site: settings.siteUrl,
  trailingSlash: 'always',
  integrations: [sitemap()],
});

import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const routesRoot = resolve(root, 'src/routes');
const outputRoot = resolve(root, 'rendered');

async function findPages(directory) {
  const pages = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) pages.push(...await findPages(path));
    else if (entry.name === '+page.svx') pages.push(path);
  }
  return pages.sort();
}

const pages = await findPages(join(routesRoot, 'kb'));
const routes = new Set(pages.map((page) => '/' + relative(routesRoot, dirname(page)).split(sep).join('/')));
const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  resolve: { alias: { '#lib': resolve(root, 'src/lib') } },
  plugins: [
    svelte({
      extensions: ['.svelte', '.svx'],
      preprocess: mdsvex({
        extensions: ['.svx'],
        layout: { runbook: resolve(root, 'src/lib/layouts/runbook.svelte') },
      }),
      compilerOptions: { css: 'injected' },
    }),
  ],
  server: { middlewareMode: true, hmr: false, watch: null },
  ssr: { noExternal: ['svelte'] },
});

try {
  const { render } = await server.ssrLoadModule('svelte/server');
  for (const page of pages) {
    const { default: Page } = await server.ssrLoadModule('/' + relative(root, page).split(sep).join('/'));
    const { head, body } = render(Page);
    const output = join(outputRoot, relative(routesRoot, dirname(page)), 'index.html');
    let html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body>${body}</body></html>\n`;
    html = html.replace(/href="(\/kb(?:\/[^"?#]*)?)([?#][^"]*)?"/g, (_, route, suffix = '') => {
      if (!routes.has(route)) throw new Error(`Unknown knowledge-base route: ${route}`);
      const target = join(outputRoot, route.slice(1), 'index.html');
      return `href="${relative(dirname(output), target).split(sep).join('/')}${suffix}"`;
    });
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, html);
    console.log(relative(root, output));
  }
} finally {
  await server.close();
}

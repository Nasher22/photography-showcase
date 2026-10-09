#!/usr/bin/env node
/**
 * sync-layout.mjs - keep the shared header and footer identical across pages.
 *
 * The site has no build step. This is an OPTIONAL developer convenience:
 * `node tools/sync-layout.mjs` copies the nav + footer blocks from the source
 * page into every other page, then re-applies each page's own "active" state.
 *
 *   node tools/sync-layout.mjs            sync index.html -> all pages
 *   node tools/sync-layout.mjs --source=gallery.html
 *   node tools/sync-layout.mjs --check    report drift, change nothing
 *
 * Safe to delete: the site works perfectly well without it.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = ['index.html', 'gallery.html', 'services.html', 'about.html', 'contact.html'];

const BLOCKS = [
  { name: 'nav', start: '<!-- #nav -->', end: '<!-- /#nav -->' },
  { name: 'footer', start: '<!-- #footer -->', end: '<!-- /#footer -->' },
];

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const sourceArg = args.find((a) => a.startsWith('--source='));
const SOURCE = sourceArg ? sourceArg.split('=')[1] : 'index.html';

if (!PAGES.includes(SOURCE)) {
  console.error(`Unknown source page "${SOURCE}". Expected one of: ${PAGES.join(', ')}`);
  process.exit(1);
}

/** Pull the inclusive text between start marker and end marker. */
function extract(html, start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from === -1 || to === -1) {
    throw new Error(`Missing markers ${start} / ${end}`);
  }
  return html.slice(from, to + end.length);
}

/** Replace the block delimited by the markers, keeping the rest of the file. */
function replaceBlock(html, start, end, block) {
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from === -1 || to === -1) {
    throw new Error(`Missing markers ${start} / ${end}`);
  }
  return html.slice(0, from) + block + html.slice(to + end.length);
}

/**
 * Rewrite the nav so exactly one link is marked active, and it is the one
 * pointing at this page.
 */
function applyActiveState(navBlock, page) {
  let out = navBlock.replace(
    /\s+class="active"|\s+aria-current="page"/g,
    ''
  );

  const linkPattern = new RegExp(`(<li><a href="${page.replace('.', '\\.')}")`, 'g');
  if (!linkPattern.test(out)) {
    throw new Error(`Page "${page}" has no nav link pointing at itself`);
  }

  return out.replace(linkPattern, '$1 class="active" aria-current="page"');
}

async function main() {
  const sourceHtml = await readFile(resolve(ROOT, SOURCE), 'utf8');
  const sourceBlocks = Object.fromEntries(
    BLOCKS.map(({ name, start, end }) => [name, extract(sourceHtml, start, end)])
  );

  let drifted = 0;

  for (const page of PAGES) {
    const path = resolve(ROOT, page);
    let html = await readFile(path, 'utf8');
    const before = html;

    for (const { name, start, end } of BLOCKS) {
      const block =
        name === 'nav'
          ? applyActiveState(sourceBlocks[name], page)
          : sourceBlocks[name];
      html = replaceBlock(html, start, end, block);
    }

    if (html === before) continue;

    drifted += 1;
    if (checkOnly) {
      console.log(`DRIFT  ${page}`);
    } else {
      await writeFile(path, html, 'utf8');
      console.log(`updated ${page}`);
    }
  }

  if (drifted === 0) {
    console.log('All pages already share the same layout.');
  } else if (checkOnly) {
    console.log(`\n${drifted} page(s) drifted. Run without --check to fix.`);
    process.exitCode = 1;
  } else {
    console.log(`\nSynced ${drifted} page(s) from ${SOURCE}.`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
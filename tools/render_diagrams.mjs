// SPDX-License-Identifier: Apache-2.0
/** Render the book's Mermaid sources to self-contained PNGs using local packages. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert.ok(process.argv[2] && process.argv[3],
  'Usage: node tools/render_diagrams.mjs <playwright-package-directory> <mermaid-package-directory>');
const playwright = resolve(process.argv[2]);
const mermaid = resolve(process.argv[3]);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(pathToFileURL(join(playwright, 'index.mjs')).href);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 2 });
  await page.setContent('<html lang="zh-CN"><body style="margin:0;background:white"><main style="display:inline-block;padding:24px"></main></body></html>');
  await page.addScriptTag({ path: join(mermaid, 'dist/mermaid.min.js') });
  for (const name of ['CH-TOOL-01', 'CH-TOOL-02']) {
    const source = await readFile(join(root, 'diagrams', `${name}.mmd`), 'utf8');
    await page.evaluate(async ({ source, name }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict',
        fontFamily: 'Microsoft YaHei, sans-serif', flowchart: { htmlLabels: false } });
      const { svg } = await mermaid.render(name, source);
      document.querySelector('main').innerHTML = svg;
      const diagram = document.querySelector('main svg');
      diagram.style.maxWidth = 'none';
      diagram.style.width = `${diagram.viewBox.baseVal.width}px`;
      diagram.style.height = `${diagram.viewBox.baseVal.height}px`;
      await document.fonts.ready;
    }, { source, name });
    const image = await page.locator('main').screenshot();
    assert.ok(image.length > 1000, `${name}: empty render`);
    await writeFile(join(root, 'diagrams', `${name}.png`), image);
    console.log(`${name}: rendered PNG (${image.length} bytes)`);
  }
} finally {
  await browser.close();
}

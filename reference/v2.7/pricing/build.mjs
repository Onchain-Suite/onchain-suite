// Assembles src/parts/* into two targets from one source:
//   src/page.html      body-only, for publishing as a Claude Artifact (the host supplies <head>)
//   public/index.html  a complete document, for Cloudflare Workers static assets
//
// Also rewrites every non-ASCII character — entities in markup, \u escapes in
// script — so the page renders identically regardless of the response charset.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const part = n => readFileSync(join(here, 'src/parts', n), 'utf8');

const TITLE = 'OnchainSuite Finance SSOT';
const DESCRIPTION =
  'Internal single source of truth for OnchainSuite pricing, costs, unit economics ' +
  'and the financial model. Every figure is either an input or derived from one.';

const ENTITIES = {
  '·':'&middot;', '✓':'&check;', '—':'&mdash;', '–':'&ndash;',
  '×':'&times;',  '“':'&ldquo;', '”':'&rdquo;', '‘':'&lsquo;',
  '’':'&rsquo;',  '∞':'&infin;', '−':'&minus;', '←':'&larr;',
  '→':'&rarr;',   ' ':'&nbsp;',  '…':'&hellip;'
};

function asciify(markup, script){
  for(const [ch, ent] of Object.entries(ENTITIES)) markup = markup.split(ch).join(ent);
  const stray = [...new Set([...markup].filter(c => c.charCodeAt(0) > 127))];
  if(stray.length) throw new Error('unmapped character(s) in markup: ' + stray.join(' '));
  script = script.replace(/[^\x00-\x7F]/g, c =>
    '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  return [markup, script];
}

// The decision log is a historical record. A data-d binding inside it renders
// TODAY's value into a description of a PAST decision, so the entry silently
// rewrites its own history every time the input changes - which is exactly how
// the 21 Aug tier-mix row came to report the 19 Sep mix, and how an overheads
// entry came to say "GBP 116 a month against GBP 175 before". Figures in the
// log are written as literals, frozen at the date of the decision.
function noLiveValuesInTheLog(pagesHtml){
  const start = pagesHtml.indexOf('id="p-decisions"');
  if(start < 0) throw new Error('decision log not found - has the page id changed?');
  const rest  = pagesHtml.slice(start);
  const end   = rest.indexOf('<section class="page"', 1);
  const block = end < 0 ? rest : rest.slice(0, end);

  const found = [...block.matchAll(/data-d="([^"]+)"/g)];
  if(found.length){
    // Line numbers are counted from each match's own offset, so they point at
    // the binding rather than at the first other use of the same key.
    const before = pagesHtml.slice(0, start).split('\n').length - 1;
    const list = found.map(m =>
      '  ' + m[1] + '  (pages.html line ' +
      (before + block.slice(0, m.index).split('\n').length) + ')').join('\n');
    throw new Error(
      found.length + ' live binding(s) inside the decision log:\n' + list +
      '\n\nThe log is a dated record, so its figures must be literals. Write the ' +
      'number the decision was made on, not a span that re-renders whatever the ' +
      'input happens to be today.');
  }
}

const pagesHtml = part('pages.html');
noLiveValuesInTheLog(pagesHtml);

let markup = part('shell.html') + '\n' + pagesHtml;
let script = part('model.js') + '\n' + part('ui.js');
[markup, script] = asciify(markup, script);

const body =
  `<title>${TITLE}</title>\n` +
  `<style>\n${part('style.css')}\n</style>\n` +
  markup + '\n' +
  `<script>\n${script}\n</` + `script>\n`;

const favicon = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" rx="6" fill="#4A6CF7"/>' +
    '<path d="M7 22 L13 16 L18 19 L25 10" fill="none" stroke="#fff" ' +
    'stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>');

// Artifact target: body content only, <title> first.
mkdirSync(join(here, 'src'), { recursive: true });
writeFileSync(join(here, 'src/page.html'), body, 'utf8');

// Cloudflare target: a complete document. <title> moves into the real <head>.
const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}">
<meta name="robots" content="noindex,nofollow">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${favicon}">
</head>
<body>
${body.replace(`<title>${TITLE}</title>\n`, '')}
</body>
</html>
`;
mkdirSync(join(here, 'public'), { recursive: true });
writeFileSync(join(here, 'public/index.html'), doc, 'utf8');

const kb = n => (Buffer.byteLength(n) / 1024).toFixed(1) + ' KB';
console.log('built src/page.html      ' + kb(body));
console.log('built public/index.html  ' + kb(doc));

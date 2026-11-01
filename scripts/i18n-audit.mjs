import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowlist = new Set(JSON.parse(fs.readFileSync(path.join(root, 'scripts/i18n-allow.json'), 'utf8')).allowedStrings);
const watchedAttributes = new Set(['placeholder', 'title', 'aria-label', 'alt', 'label', 'aria-describedby']);
const watchedFields = new Set(['text', 'texts', 'message', 'error', 'label', 'title', 'subtitle', 'description', 'heading', 'hint', 'note', 'tooltip']);
const args = process.argv.slice(2).map((item) => path.resolve(process.cwd(), item));

function collectJsxFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJsxFiles(target);
    return entry.isFile() && target.endsWith('.jsx') ? [target] : [];
  });
}

const files = args.length ? args.flatMap((target) => {
  if (!fs.existsSync(target)) return [];
  return fs.statSync(target).isDirectory() ? collectJsxFiles(target) : target.endsWith('.jsx') ? [target] : [];
}) : collectJsxFiles(path.join(root, 'src'));
const findings = [];

function report(file, source, index, text, category) {
  const visible = text.trim();
  const codeOpen = source.lastIndexOf('<code', index);
  const codeClose = source.lastIndexOf('</code>', index);
  if (codeOpen > codeClose) return;
  if (!/[A-Za-z]{3}/.test(visible) || allowlist.has(visible)) return;
  const line = source.slice(0, index).split(/\r\n|\r|\n/).length;
  findings.push(`${path.relative(root, file).replaceAll('\\', '/')}:${line} ${category}: ${visible}`);
}

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/>([^<>\r\n]+)</g)) {
    const value = match[1].replace(/\s+/g, ' ').trim();
    if (value && !value.startsWith('{') && !value.endsWith('}')) report(file, source, match.index + 1, value, 'jsx-text');
  }

const attrPattern = new RegExp(`\\b(${[...watchedAttributes].map((value) => value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')).join('|')})\\s*=\\s*(['"])(.*?)\\2`, 'g');
  for (const match of source.matchAll(attrPattern)) report(file, source, match.index, match[3], `attribute:${match[1]}`);

  const fieldPattern = new RegExp(`\\b(${[...watchedFields].join('|')})\\s*:\\s*(['"])(.*?)\\2`, 'g');
  for (const match of source.matchAll(fieldPattern)) {
    if (match[3].replace(/[^A-Za-z]/g, '').length >= 3) report(file, source, match.index, match[3], `field:${match[1]}`);
  }
}

for (const finding of findings) console.log(finding);
console.log(`i18n audit: ${findings.length} finding(s) across ${files.length} JSX file(s)`);
if (findings.length) process.exitCode = 1;

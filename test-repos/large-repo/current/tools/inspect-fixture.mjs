import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', ['--no-pager', ...args], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
const base = git('rev-parse', 'main').trim();
const head = git('rev-parse', 'large-change').trim();
const range = 'main...large-change';
const changed = git('diff', '--name-only', range).trim().split(/\r?\n/).filter(Boolean);
const oversizedPath = 'src/routing/exception-rules.js';
const source = git('show', `large-change:${oversizedPath}`);
const largeDiff = git('diff', '--no-ext-diff', '--no-color', range, '--', oversizedPath);
const validationPath = 'src/shared/validation.js';
const trailer = 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>';
const tailLine = source.split('\n').findIndex((line) =>
  line.startsWith('export function resolveTerminalException')) + 1;
const moduleFiles = changed.filter((path) => path.startsWith('modules/')).length;
const generatedFiles = changed.filter((path) => path.startsWith('.generated/')).length;

assert.notEqual(base, head, 'Branches must have distinct commits');
assert.equal(git('merge-base', 'main', 'large-change').trim(), base, 'Head must descend from baseline');
assert.ok(changed.length >= 520, 'At least 520 changed files are required');
assert.equal(moduleFiles, 540, '90 route modules must change six files each');
assert.equal(generatedFiles, 91, '90 snapshots and one catalog lock must change');
assert.ok(Buffer.byteLength(source) > 500 * 1024, 'Source must exceed 500 KiB');
assert.ok(Buffer.byteLength(largeDiff) > 256 * 1024, 'Oversized diff must exceed 256 KiB');
assert.ok(tailLine > 16000, 'Meaningful function change must be late in the source');
assert.equal(git('show', `main:${validationPath}`), git('show', `large-change:${validationPath}`),
  'Supporting validation must remain unchanged');
assert.ok(source.includes("code: 'weekend-cold-chain', deferSeconds: 7200"));
assert.ok(!git('show', `main:${oversizedPath}`).includes("code: 'weekend-cold-chain'"));
for (const branch of ['main', 'large-change']) {
  assert.ok(git('log', '-1', '--format=%B', branch).includes(trailer), `${branch}: missing commit trailer`);
  const manifest = JSON.parse(git('show', `${branch}:package.json`));
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    assert.equal(Object.keys(manifest[field] ?? {}).length, 0, `${branch}: zero dependencies required`);
  }
}
assert.equal(git('remote').trim(), '', 'Fixture must not have a remote');
assert.equal(git('status', '--porcelain').trim(), '', 'Fixture must be committed and clean');
assert.ok(readFileSync(resolve(root, 'README.md'), 'utf8').includes('Intended findings'));

console.log(JSON.stringify({
  base,
  head,
  changedFiles: changed.length,
  moduleFiles,
  generatedFiles,
  otherFiles: changed.length - moduleFiles - generatedFiles,
  oversizedSourceBytes: Buffer.byteLength(source),
  oversizedDiffBytes: Buffer.byteLength(largeDiff),
  tailFunctionLine: tailLine,
  unchangedValidation: validationPath,
  status: 'All fixture structure checks passed; clean commits, no remote, zero dependencies.',
}, null, 2));

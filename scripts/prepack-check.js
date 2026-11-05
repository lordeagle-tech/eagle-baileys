import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

assert.match(packageJson.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
assert.equal(packageJson.main, 'lib/index.js');
assert.equal(packageJson.types, 'lib/index.d.ts');
for (const required of ['lib/index.js', 'lib/index.d.ts', 'WAProto/compiler.js', 'README.md', 'LICENSE']) {
  assert.equal(existsSync(resolve(root, required)), true, `Missing package file: ${required}`);
}
const defaults = readFileSync(resolve(root, 'lib/Defaults/index.js'), 'utf8');
assert.doesNotMatch(defaults, /DEFAULT_PAIRING_CODE\s*=\s*['"]/);
console.log(`Package prepack checks passed for ${packageJson.name}@${packageJson.version}`);

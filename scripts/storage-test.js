import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { useMultiFileAuthState } from '../lib/Utils/use-multi-file-auth-state.js';
import { BufferJSON } from '../lib/Utils/generics.js';

const folder = await mkdtemp(join(tmpdir(), 'eagle-baileys-auth-'));
try {
  const first = await useMultiFileAuthState(folder);
  first.state.creds.me = { id: '254700000000@s.whatsapp.net', name: 'storage-test' };
  await first.saveCreds();
  await first.state.keys.set({ session: { 'test-key': { value: Buffer.from('persisted') } } });

  const credsFile = await readFile(join(folder, 'creds.json'), 'utf8');
  assert.equal(JSON.parse(credsFile, BufferJSON.reviver).me.name, 'storage-test');
  const second = await useMultiFileAuthState(folder);
  assert.equal(second.state.creds.me.id, '254700000000@s.whatsapp.net');
  const stored = await second.state.keys.get('session', ['test-key']);
  assert.equal(Buffer.from(stored['test-key'].value).toString(), 'persisted');
  console.log('Storage tests passed: atomic credentials and key round trips.');
} finally {
  await rm(folder, { recursive: true, force: true });
}

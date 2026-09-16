/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const ROOTS = ['database', 'storage', 'auth-secret'];
const MAGIC = Buffer.from('PRIVACYBRO_BACKUP_1\n');
const MAX_MANIFEST = 8 * 1024 * 1024;
const MAX_BYTES = 64 * 1024 ** 3;
const JOURNAL = 'desktop-restore.json';
const exists = async (p) => fs.lstat(p).then(() => true, (e) => { if (e.code === 'ENOENT') return false; throw e; });

function safePath(name) {
  if (typeof name !== 'string' || name.length > 1024 || name.includes('\\')) throw new Error('Unsafe backup path.');
  const parts = name.split('/');
  if (!ROOTS.includes(parts[0]) || (parts[0] === 'auth-secret' && parts.length !== 1) || parts.some(p => !p || p === '.' || p === '..' || /[<>:"|?*\x00-\x1f]/.test(p) || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p))) throw new Error('Unsafe backup path.');
  return name;
}

async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function outsideData(file, dataDir) {
  const relative = path.relative(path.resolve(dataDir), path.resolve(file));
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('Choose a backup file outside the application data folder.');
}

// Caller must have acknowledged DB closure AND observed the owned server exit.
async function createBackup(dataDir, destination, appVersion, stopped) {
  if (stopped !== true) throw new Error('Backup requires a cleanly stopped database and server.');
  outsideData(destination, dataDir);
  outsideData(path.join(await fs.realpath(path.dirname(destination)), path.basename(destination)), await fs.realpath(dataDir));
  const entries = [];
  async function walk(name) {
    safePath(name);
    const file = path.join(dataDir, name);
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) throw new Error('Links and special files cannot be backed up.');
    entries.push(stat.isDirectory() ? { path: name, type: 'directory' } : { path: name, type: 'file', size: stat.size, sha256: await hashFile(file) });
    if (stat.isDirectory()) for (const child of (await fs.readdir(file)).sort()) await walk(`${name}/${child}`);
  }
  for (const root of ROOTS) {
    if (await exists(path.join(dataDir, root))) await walk(root);
    else if (root === 'storage') entries.push({ path: root, type: 'directory' });
    else throw new Error(`Required local data is missing: ${root}. Open the app before making a backup.`);
  }
  const manifest = { format: 1, appVersion, createdAt: new Date().toISOString(), entries };
  validateManifest(manifest, appVersion);
  const encoded = Buffer.from(JSON.stringify(manifest));
  if (encoded.length > MAX_MANIFEST) throw new Error('Backup manifest is too large.');
  const output = await fs.open(destination, 'wx', 0o600);
  try {
    const length = Buffer.alloc(4); length.writeUInt32BE(encoded.length);
    await output.writeFile(Buffer.concat([MAGIC, length, encoded]));
    for (const entry of entries) if (entry.type === 'file') {
      for await (const chunk of createReadStream(path.join(dataDir, entry.path))) await output.writeFile(chunk);
    }
    await output.sync();
  } catch (error) {
    await output.close();
    await fs.unlink(destination);
    throw error;
  }
  await output.close();
}

function validateManifest(manifest, version) {
  if (manifest?.format !== 1 || manifest.appVersion !== version) throw new Error('Unsupported backup version. Restore using the same Privacy Bro version that created it.');
  if (!Array.isArray(manifest.entries) || manifest.entries.length > 100000) throw new Error('Invalid backup manifest.');
  const seen = new Map(); let total = 0;
  for (const entry of manifest.entries) {
    const name = safePath(entry.path); const key = name.toLowerCase();
    if (seen.has(key)) throw new Error('Duplicate backup path.');
    if (!['file', 'directory'].includes(entry.type)) throw new Error('Unsupported backup entry.');
    if (entry.type === 'file') {
      if (!Number.isSafeInteger(entry.size) || entry.size < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error('Invalid backup file metadata.');
      total += entry.size;
      if (total > MAX_BYTES) throw new Error('Backup exceeds the 64 GiB safety limit.');
    }
    seen.set(key, entry.type);
  }
  for (const entry of manifest.entries) {
    const parts = entry.path.toLowerCase().split('/'); parts.pop();
    while (parts.length) {
      if (seen.get(parts.join('/')) !== 'directory') throw new Error('Missing or invalid backup parent directory.');
      parts.pop();
    }
  }
  if (seen.get('database') !== 'directory' || seen.get('storage') !== 'directory' || seen.get('auth-secret') !== 'file' || !manifest.entries.some(e => e.path === 'database/PG_VERSION' && e.type === 'file')) throw new Error('Backup does not contain complete local data.');
  const secret = manifest.entries.find(e => e.path === 'auth-secret');
  if (!secret || secret.size < 32 || secret.size > 4096) throw new Error('Invalid device authentication secret.');
  return total;
}

async function readExact(handle, size, position) {
  const buffer = Buffer.alloc(size); let read = 0;
  while (read < size) {
    const { bytesRead } = await handle.read(buffer, read, size - read, position + read);
    if (!bytesRead) throw new Error('Truncated backup file.');
    read += bytesRead;
  }
  return buffer;
}

async function stageRestore(dataDir, archive, version) {
  const input = await fs.open(archive, 'r'); let stage;
  try {
    const stat = await input.stat();
    if (!stat.isFile()) throw new Error('Select a regular backup file.');
    const header = await readExact(input, MAGIC.length + 4, 0);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not a Privacy Bro backup.');
    const size = header.readUInt32BE(MAGIC.length);
    if (!size || size > MAX_MANIFEST) throw new Error('Invalid backup header.');
    let offset = header.length + size;
    const manifest = JSON.parse((await readExact(input, size, header.length)).toString('utf8'));
    const total = validateManifest(manifest, version);
    if (offset + total !== stat.size) throw new Error('Backup length does not match its manifest.');
    stage = await fs.mkdtemp(path.join(dataDir, '.desktop-stage-'));
    for (const entry of [...manifest.entries].filter(e => e.type === 'directory').sort((a, b) => a.path.length - b.path.length)) await fs.mkdir(path.join(stage, entry.path), { mode: 0o700 });
    for (const entry of manifest.entries) if (entry.type === 'file') {
      const output = await fs.open(path.join(stage, entry.path), 'wx', 0o600);
      const hash = createHash('sha256'); let remaining = entry.size;
      try {
        while (remaining) {
          const chunk = await readExact(input, Math.min(remaining, 1024 * 1024), offset);
          hash.update(chunk); await output.writeFile(chunk); offset += chunk.length; remaining -= chunk.length;
        }
        await output.sync();
      } finally { await output.close(); }
      if (hash.digest('hex') !== entry.sha256) throw new Error(`Backup checksum failed: ${entry.path}`);
    }
    return stage;
  } catch (error) {
    if (stage) await fs.rm(stage, { recursive: true, force: true });
    throw error;
  } finally { await input.close(); }
}

async function installRestore(dataDir, stage, stopped) {
  if (stopped !== true) throw new Error('Restore requires a cleanly stopped database and server.');
  if (path.dirname(stage) !== dataDir || !path.basename(stage).startsWith('.desktop-stage-')) throw new Error('Invalid restore staging directory.');
  const rollback = `.desktop-rollback-${randomUUID()}`;
  await fs.mkdir(path.join(dataDir, rollback), { mode: 0o700 });
  const original = {};
  for (const root of ROOTS) original[root] = await exists(path.join(dataDir, root));
  const journal = { format: 1, rollback, original };
  const handle = await fs.open(path.join(dataDir, JOURNAL), 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(journal)); await handle.sync(); } finally { await handle.close(); }
  for (const root of ROOTS) {
    if (original[root]) await fs.rename(path.join(dataDir, root), path.join(dataDir, rollback, root));
    await fs.rename(path.join(stage, root), path.join(dataDir, root));
  }
  await fs.rmdir(stage);
  return path.join(dataDir, rollback);
}

async function recoverRestore(dataDir) {
  const file = path.join(dataDir, JOURNAL);
  if (!await exists(file)) return false;
  const journal = JSON.parse(await fs.readFile(file, 'utf8'));
  if (journal.format !== 1 || !/^\.desktop-rollback-[a-f0-9-]{36}$/.test(journal.rollback) || ROOTS.some(root => typeof journal.original?.[root] !== 'boolean')) throw new Error('Restore recovery journal is invalid. Your data has been preserved; contact support.');
  const displaced = await fs.mkdtemp(path.join(dataDir, '.desktop-displaced-'));
  for (const root of ROOTS) {
    const backup = path.join(dataDir, journal.rollback, root);
    if (await exists(backup)) {
      if (await exists(path.join(dataDir, root))) await fs.rename(path.join(dataDir, root), path.join(displaced, root));
      await fs.cp(backup, path.join(dataDir, root), { recursive: true, errorOnExist: true, force: false });
    } else if (!journal.original[root] && await exists(path.join(dataDir, root))) await fs.rename(path.join(dataDir, root), path.join(displaced, root));
  }
  await fs.unlink(file);
  return true;
}

async function commitRestore(dataDir) { await fs.unlink(path.join(dataDir, JOURNAL)); }
module.exports = { createBackup, stageRestore, installRestore, recoverRestore, commitRestore, validateManifest, safePath };

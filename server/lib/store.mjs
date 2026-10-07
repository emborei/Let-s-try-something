/* ==========================================================================
   store.mjs – Speicher des Sync-Servers
   • data/db.json       aktueller Stand (Einträge, Geräte, Stammdaten)
   • data/journal.jsonl unveränderliches Protokoll (append-only)
   Der Server vergibt den maßgeblichen Zeitstempel und führt eine eigene
   Hash-Kette – nachträgliche Änderungen werden dadurch erkennbar.
   ========================================================================== */

import { readFile, writeFile, appendFile, mkdir, rename } from 'node:fs/promises';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

/** Startwert der Kette – identisch beim Anlegen und beim Prüfen. */
const genesis = (prev) => prev || 'GENESIS';

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

/** Muss exakt der Browser-Funktion entsprechen (app/js/core/model.js). */
export function entryDigestPayload(e) {
  return canonical({
    id: e.id, taskId: e.taskId, taskTitle: e.taskTitle, kind: e.kind,
    dayKey: e.dayKey, tsClient: e.tsClient, tzOffset: e.tzOffset,
    userId: e.userId, userName: e.userName, value: e.value, unit: e.unit,
    ok: e.ok, note: e.note, goods: e.goods, corrective: e.corrective,
    photoIds: e.photoIds, action: e.action, correctionOf: e.correctionOf,
    correctionReason: e.correctionReason,
  });
}

export class Store {
  constructor(dataDir) {
    this.dir = dataDir;
    this.file = path.join(dataDir, 'db.json');
    this.journal = path.join(dataDir, 'journal.jsonl');
    this.db = {
      schema: 1, createdAt: Date.now(), seq: 0,
      devices: {}, entries: [], tasks: [], business: null, plan: 'free',
      chain: { last: null },
    };
  }

  async init() {
    await mkdir(this.dir, { recursive: true });
    if (existsSync(this.file)) {
      try {
        this.db = { ...this.db, ...JSON.parse(await readFile(this.file, 'utf8')) };
      } catch (e) {
        console.error('[store] db.json unlesbar:', e.message);
      }
    }
    if (!existsSync(this.journal)) await writeFile(this.journal, '', 'utf8');
    return this;
  }

  /** Atomar speichern (temp + rename), damit ein Absturz nichts zerstört. */
  async save() {
    const tmp = this.file + '.tmp';
    await writeFile(tmp, JSON.stringify(this.db), 'utf8');
    await rename(tmp, this.file);
  }

  /** Nur anhängen – eine Zeile pro Ereignis. Dient als unabhängiges Protokoll. */
  async logJournal(record) {
    await appendFile(this.journal, JSON.stringify(record) + '\n', 'utf8');
  }

  registerDevice({ deviceId, businessName, userName }) {
    const id = deviceId || randomUUID();
    const token = randomBytes(24).toString('hex');
    this.db.devices[id] = {
      id, token, businessName: businessName || null, userName: userName || null,
      createdAt: Date.now(), lastSeen: Date.now(),
    };
    return this.db.devices[id];
  }

  deviceByToken(token) {
    if (!token) return null;
    return Object.values(this.db.devices).find((d) => d.token === token) || null;
  }

  /**
   * Einträge aufnehmen: Server setzt tsServer und verkettet per SHA-256.
   * Weicht die Gerätezeit stark ab (> 10 Minuten), wird die Serverzeit
   * verwendet und die Abweichung im Eintrag vermerkt.
   */
  ingest({ device, events, tasks, business, plan }, nowMs = Date.now()) {
    const stamped = [];
    let accepted = 0, skipped = 0, corrected = 0;

    if (tasks) this.db.tasks = tasks;
    if (business) this.db.business = business;
    if (plan) this.db.plan = plan;

    for (const ev of events || []) {
      if (!ev || !ev.id) { skipped++; continue; }
      if (this.db.entries.some((e) => e.id === ev.id)) { skipped++; continue; }

      const tsClient = Number(ev.tsClient ?? ev.localTs ?? nowMs);
      const skewMs = tsClient - nowMs;
      const implausible = Math.abs(skewMs) > 10 * 60 * 1000;
      const tsServer = implausible ? nowMs : tsClient;

      this.db.seq += 1;
      const prevHash = this.db.chain.last;             // darf null sein (erster Eintrag)
      const chainPrev = genesis(prevHash);
      const record = {
        ...ev,
        tsServer,
        serverSeq: this.db.seq,
        clockAnomaly: implausible
          ? { skewMs, note: 'Gerätezeit wich stark ab – Serverzeit verwendet.' }
          : null,
        deviceId: device?.id || null,
        receivedAt: nowMs,
      };
      record.serverHash = sha256(chainPrev + '|' + entryDigestPayload(record));
      record.serverHashPrev = prevHash;          // null beim ersten Eintrag (= Kettenstart)
      this.db.chain.last = record.serverHash;
      this.db.entries.push(record);
      accepted++;
      if (implausible) corrected++;

      stamped.push({
        id: record.id, tsServer: record.tsServer, seq: record.serverSeq,
        serverHash: record.serverHash, serverHashPrev: record.serverHashPrev,
        clockAnomaly: record.clockAnomaly,
      });
    }
    return { accepted, skipped, corrected, stamped, seq: this.db.seq };
  }

  verifyChain() {
    let prev = null;
    const problems = [];
    for (const e of this.db.entries.slice().sort((a, b) => a.serverSeq - b.serverSeq)) {
      const expect = sha256(genesis(e.serverHashPrev) + '|' + entryDigestPayload(e));
      if (expect !== e.serverHash) problems.push({ id: e.id, seq: e.serverSeq, type: 'hash' });
      else if ((e.serverHashPrev || null) !== (prev || null)) problems.push({ id: e.id, seq: e.serverSeq, type: 'chain' });
      prev = e.serverHash;
    }
    return { valid: problems.length === 0, checked: this.db.entries.length, problems };
  }

  stats() {
    const byDay = new Map();
    for (const e of this.db.entries) byDay.set(e.dayKey, (byDay.get(e.dayKey) || 0) + 1);
    const days = [...byDay.keys()].sort();
    return {
      devices: Object.keys(this.db.devices).length,
      entries: this.db.entries.length,
      seq: this.db.seq,
      firstDay: days[0] || null,
      lastDay: days.at(-1) || null,
      deviations: this.db.entries.filter((e) => e.ok === false).length,
      chain: this.verifyChain(),
      uptimeSec: Math.round(process.uptime()),
      business: this.db.business?.name || null,
    };
  }
}

export { canonical };

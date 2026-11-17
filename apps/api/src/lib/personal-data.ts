// Datos personales sensibles (decisión del 17/11/2026): los cifra la API, campo a campo, con AES-256-GCM.
//
//   - Qué: número del documento de identidad, número de la Seguridad Social, IBAN y salud o discapacidad.
//   - Texto cifrado: «<versión>:<base64(iv 12 bytes | etiqueta 16 bytes | cifrado)>». La versión dice con qué clave se
//     cifró; la configuración puede tener varias (PERSONAL_DATA_KEYS) para rotar: se cifra con la actual y se descifra
//     con la que diga el prefijo.
//   - Huella del documento: HMAC-SHA256 (PERSONAL_DATA_HMAC_KEY) de «<ETT>:<número normalizado>», para encontrar
//     duplicados sin descifrar. Incluye la ETT: la misma persona en dos ETT tiene huellas distintas.
//   - Las claves no están en la base de datos. Sin ellas, las rutas que cifran o descifran responden 503.

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { ApiError } from './errors.js';

export interface PersonalDataConfig {
  /** Claves AES-256 por versión (32 bytes). */
  keys: Record<string, Buffer>;
  /** Versión con la que se cifra. */
  currentKeyId: string;
  /** Clave de la huella HMAC (32 bytes o más). */
  hmacKey: Buffer;
}

const VERSION_RE = /^v[0-9]+$/;

/** PERSONAL_DATA_KEYS="v1:<base64>,v2:<base64>"; la actual, PERSONAL_DATA_KEY_ID (por defecto, la última). */
export function loadPersonalDataConfig(env: NodeJS.ProcessEnv): PersonalDataConfig | undefined {
  const list = env.PERSONAL_DATA_KEYS?.trim();
  const hmac = env.PERSONAL_DATA_HMAC_KEY?.trim();
  if (!list && !hmac) return undefined;
  if (!list || !hmac) throw new Error('Para los datos personales hacen falta PERSONAL_DATA_KEYS y PERSONAL_DATA_HMAC_KEY');
  const keys: Record<string, Buffer> = {};
  let last = '';
  for (const entry of list.split(',').map((x) => x.trim()).filter(Boolean)) {
    const [id, value] = entry.split(':');
    if (!id || !VERSION_RE.test(id) || !value) throw new Error('PERSONAL_DATA_KEYS: cada clave es «vN:<base64 de 32 bytes>»');
    const key = Buffer.from(value, 'base64');
    if (key.length !== 32) throw new Error(`PERSONAL_DATA_KEYS: la clave ${id} no tiene 32 bytes`);
    keys[id] = key;
    last = id;
  }
  const currentKeyId = env.PERSONAL_DATA_KEY_ID?.trim() || last;
  if (!keys[currentKeyId]) throw new Error(`PERSONAL_DATA_KEY_ID: no hay clave ${currentKeyId}`);
  const hmacKey = Buffer.from(hmac, 'base64');
  if (hmacKey.length < 32) throw new Error('PERSONAL_DATA_HMAC_KEY: mínimo 32 bytes');
  return { keys, currentKeyId, hmacKey };
}

export class PersonalData {
  constructor(private readonly config: PersonalDataConfig) {}

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.config.keys[this.config.currentKeyId]!, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return `${this.config.currentKeyId}:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')}`;
  }

  decrypt(value: string): string {
    const sep = value.indexOf(':');
    const key = this.config.keys[value.slice(0, sep)];
    if (sep < 0 || !key) throw new ApiError(503, 'servicio_no_disponible', 'Falta la clave con la que se cifró este dato');
    const raw = Buffer.from(value.slice(sep + 1), 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  }

  /** Huella del documento en esta ETT. */
  fingerprint(tenantId: string, normalizedNumber: string): string {
    return createHmac('sha256', this.config.hmacKey).update(`${tenantId}:${normalizedNumber}`).digest('hex');
  }

  /** ¿Está cifrado con una clave que no es la actual? (para rotar) */
  needsRotation(value: string): boolean {
    return !value.startsWith(`${this.config.currentKeyId}:`);
  }
}

export function requirePersonalData(pd: PersonalData | undefined): PersonalData {
  if (!pd) {
    throw new ApiError(503, 'servicio_no_disponible',
      'El cifrado de datos personales no está configurado (PERSONAL_DATA_KEYS): no se pueden guardar ni ver datos sensibles');
  }
  return pd;
}

// ---------------------------------------------------------------------------
// Validación y formato (puro)
// ---------------------------------------------------------------------------
const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export const normalizeIdNumber = (value: string) => value.toUpperCase().replace(/[\s.-]/g, '');

/** DNI: 8 cifras y letra de control. */
export function validDni(value: string): boolean {
  const v = normalizeIdNumber(value);
  return /^[0-9]{8}[A-Z]$/.test(v) && DNI_LETTERS[Number(v.slice(0, 8)) % 23] === v[8];
}

/** NIE: X, Y o Z (0, 1 o 2), 7 cifras y letra de control. */
export function validNie(value: string): boolean {
  const v = normalizeIdNumber(value);
  if (!/^[XYZ][0-9]{7}[A-Z]$/.test(v)) return false;
  const number = Number(`${'XYZ'.indexOf(v[0]!)}${v.slice(1, 8)}`);
  return DNI_LETTERS[number % 23] === v[8];
}

export function validIdDocument(type: string, value: string): boolean {
  const v = normalizeIdNumber(value);
  if (type === 'dni') return validDni(v);
  if (type === 'nie') return validNie(v);
  return /^[A-Z0-9]{3,20}$/.test(v);
}

/** Número de la Seguridad Social: 12 cifras (provincia 2, número 8, control 2 = los 10 primeros mod 97). */
export const normalizeSsNumber = (value: string) => value.replace(/[\s/.-]/g, '');
export function validSsNumber(value: string): boolean {
  const v = normalizeSsNumber(value);
  if (!/^[0-9]{12}$/.test(v)) return false;
  return Number(BigInt(v.slice(0, 10)) % 97n) === Number(v.slice(10));
}

/** IBAN español: ES + 22 cifras, con su control (mod 97 = 1). */
export const normalizeIban = (value: string) => value.toUpperCase().replace(/\s/g, '');
export function validSpanishIban(value: string): boolean {
  const v = normalizeIban(value);
  if (!/^ES[0-9]{22}$/.test(v)) return false;
  const rearranged = `${v.slice(4)}${v.slice(0, 4)}`.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  return BigInt(rearranged) % 97n === 1n;
}

/** «•••••123X»: los cuatro últimos. */
export const mask = (hint: string | null | undefined) => (hint ? `•••••${hint}` : null);
export const hintOf = (value: string) => value.slice(-4);

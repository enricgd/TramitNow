// lib/personal-data.ts: cifrado AES-256-GCM con claves versionadas, huella HMAC y validación de DNI, NIE, NSS e IBAN.
// Todos los números son inventados.

import { describe, expect, it } from 'vitest';
import {
  PersonalData,
  loadPersonalDataConfig,
  mask,
  validDni,
  validIdDocument,
  validNie,
  validSpanishIban,
  validSsNumber,
} from '../src/lib/personal-data.js';

const K1 = Buffer.alloc(32, 1).toString('base64');
const K2 = Buffer.alloc(32, 2).toString('base64');
const H = Buffer.alloc(32, 3).toString('base64');

describe('cifrado', () => {
  it('cifra y descifra, y el texto cifrado no contiene el dato', () => {
    const pd = new PersonalData(loadPersonalDataConfig({ PERSONAL_DATA_KEYS: `v1:${K1}`, PERSONAL_DATA_HMAC_KEY: H })!);
    const enc = pd.encrypt('12345678Z');
    expect(enc).toMatch(/^v1:/);
    expect(enc).not.toContain('12345678');
    expect(pd.decrypt(enc)).toBe('12345678Z');
    expect(pd.encrypt('12345678Z')).not.toBe(enc);
  });

  it('rota: cifra con la última y sigue leyendo lo cifrado con la anterior', () => {
    const old = new PersonalData(loadPersonalDataConfig({ PERSONAL_DATA_KEYS: `v1:${K1}`, PERSONAL_DATA_HMAC_KEY: H })!);
    const enc = old.encrypt('dato');
    const pd = new PersonalData(loadPersonalDataConfig({ PERSONAL_DATA_KEYS: `v1:${K1},v2:${K2}`, PERSONAL_DATA_HMAC_KEY: H })!);
    expect(pd.encrypt('x')).toMatch(/^v2:/);
    expect(pd.decrypt(enc)).toBe('dato');
    expect(pd.needsRotation(enc)).toBe(true);
  });

  it('un dato manipulado no se descifra', () => {
    const pd = new PersonalData(loadPersonalDataConfig({ PERSONAL_DATA_KEYS: `v1:${K1}`, PERSONAL_DATA_HMAC_KEY: H })!);
    const enc = pd.encrypt('dato');
    const raw = Buffer.from(enc.slice(3), 'base64');
    raw[raw.length - 1] = raw[raw.length - 1]! ^ 1;
    expect(() => pd.decrypt(`v1:${raw.toString('base64')}`)).toThrow();
  });

  it('la huella depende de la ETT', () => {
    const pd = new PersonalData(loadPersonalDataConfig({ PERSONAL_DATA_KEYS: `v1:${K1}`, PERSONAL_DATA_HMAC_KEY: H })!);
    expect(pd.fingerprint('a', '12345678Z')).toMatch(/^[0-9a-f]{64}$/);
    expect(pd.fingerprint('a', '12345678Z')).not.toBe(pd.fingerprint('b', '12345678Z'));
  });

  it('sin variables no hay cifrado; con una sola o una clave corta, no arranca', () => {
    expect(loadPersonalDataConfig({})).toBeUndefined();
    expect(() => loadPersonalDataConfig({ PERSONAL_DATA_KEYS: `v1:${K1}` })).toThrow();
    expect(() => loadPersonalDataConfig({ PERSONAL_DATA_KEYS: 'v1:abc', PERSONAL_DATA_HMAC_KEY: H })).toThrow();
  });
});

describe('validación', () => {
  it('DNI y NIE con su letra', () => {
    expect(validDni('12345678Z')).toBe(true);
    expect(validDni('12345678-z')).toBe(true);
    expect(validDni('12345678A')).toBe(false);
    expect(validNie('Y1234567X')).toBe(true);
    expect(validNie('Y1234567A')).toBe(false);
    expect(validIdDocument('passport', 'AB123456')).toBe(true);
  });

  it('número de la Seguridad Social e IBAN español con su control', () => {
    expect(validSsNumber('28/00000001/38')).toBe(true);
    expect(validSsNumber('280000000139')).toBe(false);
    expect(validSpanishIban('ES82 0000 0000 0000 0000 0000')).toBe(true);
    expect(validSpanishIban('ES8300000000000000000000')).toBe(false);
  });

  it('enmascara con los cuatro últimos', () => {
    expect(mask('678Z')).toBe('•••••678Z');
    expect(mask(null)).toBeNull();
  });
});

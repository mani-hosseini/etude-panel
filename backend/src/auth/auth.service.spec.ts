import * as argon2 from 'argon2';
import { normalizeName } from '../common/utils/mappers';

describe('Auth helpers', () => {
  it('normalizes Persian names', () => {
    expect(normalizeName('  آوا  ')).toBe('آوا');
    expect(normalizeName('محمدی   رضایی')).toBe('محمدی رضایی');
  });
});

describe('AuthService password hashing contract', () => {
  it('verifies argon2 hashes used by AuthService', async () => {
    const password = 'etudepiano123';
    const hash = await argon2.hash(password);
    await expect(argon2.verify(hash, password)).resolves.toBe(true);
    await expect(argon2.verify(hash, 'wrong')).resolves.toBe(false);
  });
});

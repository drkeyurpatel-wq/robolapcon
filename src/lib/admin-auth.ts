import { cookies } from 'next/headers';

const COOKIE_NAME = 'rlc_admin';
const SALT = 'robolapcon2026salt';
const TTL_SECONDS = 12 * 60 * 60; // 12 hours

function makeToken(password: string): string {
  return Buffer.from(password + SALT).toString('base64');
}

export function verifyAdmin(): boolean {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = makeToken(process.env.ADMIN_PASSWORD || '');
  return token === expected;
}

export function getAdminCookieValue(): string {
  return makeToken(process.env.ADMIN_PASSWORD || '');
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_TTL = TTL_SECONDS;

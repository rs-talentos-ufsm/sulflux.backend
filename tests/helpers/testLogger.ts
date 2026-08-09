import type { Response } from 'supertest';

export function logIfFail(res: Response) {
  if (res.status >= 400) {
    console.error('\n❌ TEST FAILED');
    console.error('Status:', res.status);
    console.error('Body:', JSON.stringify(res.body, null, 2));
  }
}

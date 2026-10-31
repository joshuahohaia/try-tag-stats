import { describe, it, expect } from 'vitest';
import { kitErrorMessage } from './useKits';

const status = (s: number) => ({ response: { status: s } });

describe('kitErrorMessage', () => {
  it('explains conflicts, rate limits and bad input in plain words', () => {
    expect(kitErrorMessage(status(409))).toMatch(/Someone else changed/);
    expect(kitErrorMessage(status(429))).toMatch(/Wait a few minutes/);
    expect(kitErrorMessage(status(400))).toMatch(/not accepted/);
    expect(kitErrorMessage(new Error('x'))).toMatch(/Could not save/);
  });
});

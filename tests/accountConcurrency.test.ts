import { describe, expect, test } from 'bun:test';
import {
  isAccountConcurrencyEligible,
  readAccountConcurrencyConfig,
  validateAccountConcurrency,
} from '../src/features/authFiles/accountConcurrency';

describe('account concurrency editor rules', () => {
  test('accepts the supported queue combinations', () => {
    expect(
      validateAccountConcurrency({ maxConcurrency: 0, maxWaiting: 0, waitTimeoutMs: 0 })
    ).toBeNull();
    expect(
      validateAccountConcurrency({ maxConcurrency: 2, maxWaiting: 6, waitTimeoutMs: 8000 })
    ).toBeNull();
    expect(
      validateAccountConcurrency({ maxConcurrency: 2, maxWaiting: 0, waitTimeoutMs: 0 })
    ).toBeNull();
  });

  test.each([
    [{ maxConcurrency: -1, maxWaiting: 0, waitTimeoutMs: 0 }, 'max_concurrency_range'],
    [{ maxConcurrency: 2, maxWaiting: 10_001, waitTimeoutMs: 8000 }, 'max_waiting_range'],
    [{ maxConcurrency: 2, maxWaiting: 6, waitTimeoutMs: 99 }, 'wait_timeout_range'],
    [{ maxConcurrency: 0, maxWaiting: 1, waitTimeoutMs: 0 }, 'wait_timeout_without_queue'],
    [{ maxConcurrency: 2, maxWaiting: 0, waitTimeoutMs: 100 }, 'wait_timeout_without_queue'],
    [{ maxConcurrency: 2, maxWaiting: 1, waitTimeoutMs: 0 }, 'wait_timeout_required'],
  ] as const)('rejects invalid combination %#', (value, error) => {
    expect(validateAccountConcurrency(value)).toBe(error);
  });

  test('normalizes absent auth-file settings to the unlimited tuple', () => {
    expect(readAccountConcurrencyConfig({ type: 'codex' })).toEqual({
      maxConcurrency: 0,
      maxWaiting: 0,
      waitTimeoutMs: 0,
    });
  });

  test('does not offer controls to API-key or virtual credentials', () => {
    expect(isAccountConcurrencyEligible({ name: 'codex.json', type: 'codex' })).toBe(true);
    expect(
      isAccountConcurrencyEligible({
        name: 'codex-api.json',
        type: 'codex',
        account_type: 'api_key',
      })
    ).toBe(false);
    expect(
      isAccountConcurrencyEligible({ name: 'codex-api.json', type: 'codex', api_key: 'secret' })
    ).toBe(false);
    expect(
      isAccountConcurrencyEligible({ name: 'codex-runtime', type: 'codex', runtime_only: true })
    ).toBe(false);
  });
});

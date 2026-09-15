import type { AuthFileItem } from '@/types/authFile';
import { isRuntimeOnlyAuthFile, normalizeProviderKey } from './constants';

export type AccountConcurrencyConfig = {
  maxConcurrency: number;
  maxWaiting: number;
  waitTimeoutMs: number;
};

export type AccountConcurrencyValidationError =
  | 'integer'
  | 'max_concurrency_range'
  | 'max_waiting_range'
  | 'wait_timeout_range'
  | 'wait_timeout_required'
  | 'wait_timeout_without_queue';

const readNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const readAccountConcurrencyValue = (
  value: Record<string, unknown>,
  key: 'max_concurrency' | 'max_waiting' | 'wait_timeout_ms'
): number => readNonNegativeInteger(value[key]) ?? 0;

export const readAccountConcurrencyConfig = (
  value: Record<string, unknown>
): AccountConcurrencyConfig => ({
  maxConcurrency: readAccountConcurrencyValue(value, 'max_concurrency'),
  maxWaiting: readAccountConcurrencyValue(value, 'max_waiting'),
  waitTimeoutMs: readAccountConcurrencyValue(value, 'wait_timeout_ms'),
});

export const parseAccountConcurrencyText = (value: string): number | null =>
  readNonNegativeInteger(value);

export const validateAccountConcurrency = (
  value: AccountConcurrencyConfig
): AccountConcurrencyValidationError | null => {
  if (
    !Number.isSafeInteger(value.maxConcurrency) ||
    !Number.isSafeInteger(value.maxWaiting) ||
    !Number.isSafeInteger(value.waitTimeoutMs)
  ) {
    return 'integer';
  }
  if (value.maxConcurrency < 0 || value.maxConcurrency > 10_000) {
    return 'max_concurrency_range';
  }
  if (value.maxWaiting < 0 || value.maxWaiting > 10_000) {
    return 'max_waiting_range';
  }
  if (value.waitTimeoutMs !== 0 && (value.waitTimeoutMs < 100 || value.waitTimeoutMs > 300_000)) {
    return 'wait_timeout_range';
  }
  if (value.maxConcurrency === 0 && (value.maxWaiting !== 0 || value.waitTimeoutMs !== 0)) {
    return 'wait_timeout_without_queue';
  }
  if (value.maxConcurrency > 0 && value.maxWaiting === 0 && value.waitTimeoutMs !== 0) {
    return 'wait_timeout_without_queue';
  }
  if (value.maxConcurrency > 0 && value.maxWaiting > 0 && value.waitTimeoutMs < 100) {
    return 'wait_timeout_required';
  }
  return null;
};

export const isAccountConcurrencyEligible = (file: AuthFileItem): boolean => {
  const providerKey = normalizeProviderKey(String(file.type ?? file.provider ?? ''));
  if (providerKey !== 'codex' || isRuntimeOnlyAuthFile(file)) return false;

  const apiKey = file.api_key ?? file['api-key'] ?? file.apiKey;
  if (typeof apiKey === 'string' && apiKey.trim()) return false;

  const authType = String(file.accountType ?? file.account_type ?? file.auth_kind ?? '')
    .trim()
    .toLowerCase();
  return authType !== 'apikey' && authType !== 'api_key' && authType !== 'api-key';
};

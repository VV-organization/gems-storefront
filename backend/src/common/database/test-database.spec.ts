import { expect, it } from 'vitest';
import { requireSafeTestDatabase } from './test-database';
it('rejects missing, foreign and nonlocal databases before any reset', () => {
  for (const target of [undefined, 'postgres://foreign_test:x@localhost/foreign_test', 'postgres://gems_test:x@production/gems_test', 'postgres://root:x@localhost/gems_test', 'postgres://gems_test:x@localhost/gems', 'https://gems_test:x@localhost/gems_test']) {
    expect(() => requireSafeTestDatabase(target)).toThrow();
  }
});
it('accepts only explicitly isolated local test targets', () => {
  expect(requireSafeTestDatabase('postgres://gems_test:local@127.0.0.1:55440/gems_test')).toContain('/gems_test');
});

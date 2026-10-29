/** Must run before constructing a pool or executing destructive fixture SQL. */
export function requireSafeTestDatabase(target: string | undefined): string {
  if (!target) throw new Error('GEMS_TEST_DATABASE_URL is required. Use isolated gems_test.');
  const url = new URL(target);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', 'postgres-test'].includes(url.hostname) || url.pathname !== '/gems_test' || url.username !== 'gems_test' || url.search || url.hash) {
    throw new Error('Refusing to reset a database other than local gems_test owned by gems_test.');
  }
  return target;
}

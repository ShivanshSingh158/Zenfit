/**
 * handleSyncError
 * 
 * Production-grade error handler for Firebase/Firestore operations.
 * Logs the error passively without displaying blocking Alert modals,
 * allowing optimistic UI updates and background offline retry / persistence
 * to handle sync seamlessly without interrupting the user.
 */
export function handleSyncError(error: any) {
  const code = error?.code || '';
  if (code === 'permission-denied' || code === 'invalid-argument' || code === 'unauthenticated' || code === 'quota-exceeded') {
    console.error(`[Sync Handler] FATAL Firestore Rejection (${code}):`, error?.message || error);
    return;
  }
  console.warn('[Sync Handler] Transient network/sync latency:', error?.message || error);
}

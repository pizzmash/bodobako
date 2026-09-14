/** Original geometric coyote beneath a crescent moon. */
export function CoyoteEmblem({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 120 140" fill="none" aria-hidden="true" className={className}>
    <path d="M82 10a27 27 0 1 0 23 42A28 28 0 0 1 82 10Z" fill="currentColor" opacity=".7" />
    <path d="m29 49 17 17 12-7 22-30 1 36 19 21-26-3-5 22 19 26H32l14-33-13-16Z" fill="currentColor" />
    <path d="m49 83 11 8-12 12m25-30 8 2" stroke="#101827" strokeWidth="3" strokeLinecap="round" />
    <path d="M13 132h94M21 139h79" stroke="currentColor" opacity=".5" />
    <path d="m21 20 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="currentColor" />
  </svg>;
}

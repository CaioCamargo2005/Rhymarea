export function getVoterToken(): string {
  if (typeof window === 'undefined') return 'ssr-no-token';
  const KEY = 'liga_voter_token';
  let token = window.localStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, '');
    window.localStorage.setItem(KEY, token);
  }
  return token;
}

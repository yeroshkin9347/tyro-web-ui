import jwtDecode from 'jwt-decode';

const tokenKey = 'accessToken';

export function isValidToken(accessToken: string) {
  if (!accessToken) {
    return false;
  }
  const decoded = jwtDecode<{ exp: number }>(accessToken);

  const currentTime = Date.now() / 1000;

  return decoded.exp > currentTime;
}

export function setToken(accessToken: string | null) {
  if (accessToken) {
    localStorage.setItem(tokenKey, accessToken);
  }
}

export function getToken() {
  return localStorage.getItem(tokenKey);
}

export function clearToken() {
  localStorage.removeItem(tokenKey);
}

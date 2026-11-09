export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const octets = host.split('.').map(Number);
    const isPrivateIpv4 =
      octets.length === 4 &&
      octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) &&
      (octets[0] === 10 ||
        octets[0] === 127 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 169 && octets[1] === 254));

    if (isPrivateIpv4) {
      return `${window.location.protocol}//${host}:3001`;
    }

    // If deployed on Netlify or custom domain, never default to localhost:3001
    if (!isLocalhost && !isPrivateIpv4) {
      const envUrl = process.env.NEXT_PUBLIC_API_URL;
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
      }
      return 'https://qfast-on1w.onrender.com';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

/**
 * Resolves the application base URL dynamically for OAuth redirects, QR code generation,
 * and canonical sharing links across development and production environments.
 */
export const getURL = (path: string = ""): string => {
  let url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    (typeof window !== "undefined" && window.location.origin ? window.location.origin : "http://localhost:3000");

  // Ensure http:// or https:// protocol prefix
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Remove trailing slash
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }

  if (!path) return url;
  return `${url}${path.startsWith("/") ? path : `/${path}`}`;
};

import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
let apiOrigin = "";
if (apiUrl) {
  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    apiOrigin = "";
  }
}

/**
 * The Content-Security-Policy for pages. Built when the headers are asked for,
 * so `next dev` and `next start` each get their own: development needs `eval`
 * (React's debugging) and websockets (hot reload) and production does not.
 *
 * `'unsafe-inline'` stays for scripts and styles: Next injects inline scripts for
 * hydration and the UI library sets inline styles, and removing it needs a
 * nonce-based policy. React escapes text and the code renders no raw HTML,
 * which is what limits the cost.
 */
function pageContentSecurityPolicy(isDevelopment: boolean) {
  const connectSources = ["'self'"];
  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("http://localhost:8000", "http://localhost:4000", "ws:", "wss:");
  }
  if (apiOrigin && !connectSources.includes(apiOrigin)) {
    connectSources.push(apiOrigin);
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://api.qrserver.com",
    `connect-src ${connectSources.join(" ")}`,
    // The only iframe is the admin PDF viewer, which shows a file from this origin.
    "frame-src 'self' blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** The admin PDF viewer is embedded by our own admin page, so it may be framed by this origin and nothing else. */
const PDF_VIEWER_CSP = "default-src 'self'; frame-ancestors 'self'; object-src 'self' blob: data:";

const nextConfig: NextConfig = {
  // Do not announce the framework and version in every response.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: pageContentSecurityPolicy(process.env.NODE_ENV !== "production"),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      // Listed after the rule above on purpose: for the same header key the last
      // matching rule wins, so only this route loosens framing, and only to "self".
      {
        source: "/admin/api/tor-pdf",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            value: PDF_VIEWER_CSP,
          },
        ],
      },
    ];
  },
};

export default nextConfig;

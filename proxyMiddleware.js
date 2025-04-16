"use strict";

const {
  createProxyMiddleware,
  responseInterceptor,
} = require("http-proxy-middleware");

// If a proxy is provided via environment variables (HTTP_PROXY or HTTPS_PROXY),
// create an agent for outbound requests.
let agent;
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { HttpsProxyAgent } = require("https-proxy-agent");
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  agent = new HttpsProxyAgent(proxyUrl);
  console.log("Using proxy agent for outbound requests:", proxyUrl);
}

const proxyOptions = {
  target: "", // The target is dynamically determined in the router.
  changeOrigin: true,
  secure: false, // Bypass SSL certificate verification if needed.
  selfHandleResponse: true, // Required to intercept and modify the response.
  // If an outbound proxy agent was set, add it here.
  ...(agent && { agent }),
  router: (req) => {
    const targetUrl = `https://${req.targetDomain}`;
    console.log(`Router: forwarding request to ${targetUrl}`);
    return targetUrl;
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log("onProxyReq: Request is being forwarded to the target");
    // Set the Host header to the target domain for proper SNI/virtual hosting.
    proxyReq.setHeader("host", req.targetDomain);
    // Optionally set a user-agent header.
    proxyReq.setHeader(
      "user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    );
  },
  on: {
    proxyRes: responseInterceptor(
      async (responseBuffer, proxyRes, req, res) => {
        const contentType = proxyRes.headers["content-type"] || "";
        if (contentType.includes("text/html")) {
          let body = responseBuffer.toString("utf8");
          // Rewrite absolute URLs pointing to the target domain with the incoming host.
          const targetDomainPattern = new RegExp(
            `https://${req.targetDomain}`,
            "g"
          );
          body = body.replace(
            targetDomainPattern,
            `https://${req.headers.host}`
          );
          return body;
        }
        // For non-HTML responses, return the raw response buffer.
        return responseBuffer;
      }
    ),
  },
  onError: (err, req, res) => {
    console.error("onError: A proxy error occurred:", err);
    // Instead of sending a 500 error, redirect the client to the main target site.
    // Using HTTP 302 (Found) for redirection.
    if (!res.headersSent && !res.finished) {
      try {
        res.writeHead(302, { Location: `https://${req.targetDomain}` });
      } catch (writeErr) {
        console.error("onError: Error writing redirect header:", writeErr);
      }
      res.end();
    } else if (!res.finished) {
      res.end();
    }
  },
};

const domainProxyMiddleware = createProxyMiddleware(proxyOptions);

module.exports = domainProxyMiddleware;

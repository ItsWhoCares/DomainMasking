"use strict";

const {
  createProxyMiddleware,
  responseInterceptor,
} = require("http-proxy-middleware");

const domainProxyMiddleware = createProxyMiddleware({
  target: "", // The target is dynamically determined in the router.
  changeOrigin: true,
  secure: false, // Set to false if you need to bypass SSL certificate validation.
  selfHandleResponse: true, // Required when using responseInterceptor.
  router: (req) => {
    const targetUrl = `https://${req.targetDomain}`;
    console.log(`Router: forwarding request to ${targetUrl}`);
    return targetUrl;
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log("onProxyReq: Request is being forwarded to the target");
    // Set the Host header to the target domain (required for proper SNI/virtual hosting).
    proxyReq.setHeader("host", req.targetDomain);
    // Optionally, set a common user-agent header.
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
          // Replace all absolute URLs pointing to the target domain with those for the incoming host.
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
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
    }
    res.end("A proxy error occurred.");
  },
});

module.exports = domainProxyMiddleware;

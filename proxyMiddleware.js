"use strict";

const { createProxyMiddleware } = require("http-proxy-middleware");

const domainProxyMiddleware = createProxyMiddleware({
  target: "", // The target will be dynamically determined per request.
  changeOrigin: true,
  selfHandleResponse: false,
  // Dynamically set the target URL using the target domain attached to the request.
  router: (req) => `https://${req.targetDomain}`,
  // Rewrite the Location header if needed, so that redirects point back to the incoming domain.
  onProxyRes: (proxyRes, req, res) => {
    console.log("Proxy response headers:", proxyRes.headers);
    if (proxyRes.headers["location"]) {
      proxyRes.headers["location"] = proxyRes.headers["location"].replace(
        req.targetDomain,
        req.headers.host
      );
    }
  },
  // Remove the original Host header.
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.removeHeader("host");
  },
});

module.exports = domainProxyMiddleware;

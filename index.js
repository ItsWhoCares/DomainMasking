const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// Configuration: mapping of user domain to target domain.
// In a production app, you might fetch this from a database.
const domainMappings = {
  "user.com": "original.com",
  "localhost:3000": "icedautomations.com",
};

// Middleware to select the target based on the Host header.
app.use((req, res, next) => {
  const incomingHost = req.headers.host;
  // Look up the target domain from our mappings.
  const targetDomain = domainMappings[incomingHost];

  if (!targetDomain) {
    res.status(404).send("Domain not configured for masking.");
    return;
  }

  // Attach targetDomain to the request for use in the proxy middleware.
  req.targetDomain = targetDomain;
  next();
});

// Create a reverse proxy middleware.
app.use(
  "/",
  createProxyMiddleware({
    // The target will be dynamically determined per request.
    target: "", // Will be overridden in the onProxyReq callback.
    changeOrigin: true,
    selfHandleResponse: false, // Set to true if you plan to modify the response.

    // Dynamically set the target URL for each request.
    router: (req) => {
      return `https://${req.targetDomain}`;
    },

    // Modify response headers if needed (for example, rewriting redirects).
    onProxyRes: (proxyRes, req, res) => {
      // Check if the response includes a Location header.
      if (proxyRes.headers["location"]) {
        // Rewrite the location header so that it points to the incoming domain.
        proxyRes.headers["location"] = proxyRes.headers["location"].replace(
          req.targetDomain,
          req.headers.host
        );
      }
    },

    // Optionally, you can modify the proxy request headers.
    onProxyReq: (proxyReq, req, res) => {
      // Remove the original Host header.
      proxyReq.removeHeader("host");
      // Set a common User-Agent header to mimic a typical browser.
      //   proxyReq.setHeader(
      //     "User-Agent",
      //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
      //   );
    },
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Reverse proxy server running on port ${PORT}`);
});

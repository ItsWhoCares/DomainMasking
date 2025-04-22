"use strict";

// --- Add at the very top: ---
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(reason);
  process.exit(1);
});

const express = require("express");
const domainProxyMiddleware = require("./proxyMiddleware");
const { updateDomainMappings, getTargetDomain } = require("./domainMappings");

const app = express();

// Read the update interval (in milliseconds) from the environment variable.
// Default to 60000 ms (1 minute) if not provided.
const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL
  ? parseInt(process.env.UPDATE_INTERVAL, 10)
  : 60000;

// Immediately load domain mappings at startup and refresh them at the specified interval.
updateDomainMappings();
setInterval(updateDomainMappings, UPDATE_INTERVAL);

// Middleware to select the target domain based on the incoming Host header.
app.use((req, res, next) => {
  const incomingHost = req.headers.host;
  const targetDomain = getTargetDomain(incomingHost);

  if (!targetDomain) {
    res.status(404).send("Domain not configured for masking.");
    return;
  }

  // Attach the target domain to the request for use in the proxy middleware.
  req.targetDomain = targetDomain;
  next();
});

// Use the reverse proxy middleware.
app.use("/", domainProxyMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Reverse proxy server running on port ${PORT}`);
});

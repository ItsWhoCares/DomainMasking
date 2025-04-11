"use strict";

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing one or more Supabase environment variables: SUPABASE_URL, SUPABASE_ANON_KEY"
  );
  // Optionally exit if these credentials are critical.
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

let domainMappings = {};

/**
 * Fetch and update domainMappings from the Supabase DomainMapping table.
 * The mapping converts each proxy_domain to its corresponding original_domain.
 */
async function updateDomainMappings() {
  try {
    const { data, error } = await supabase
      .from("DomainMapping")
      .select("proxy_domain, original_domain")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching domain mappings:", error);
      return;
    }

    // Build a mapping: key is proxy_domain, value is original_domain.
    const mapping = {};
    data.forEach((row) => {
      mapping[row.proxy_domain] = row.original_domain;
    });

    domainMappings = mapping;
    console.log("Domain mappings updated:", domainMappings);
  } catch (err) {
    console.error("Error updating domain mappings:", err);
  }
}

/**
 * Retrieve the target domain for a given host.
 * @param {string} host - The incoming host.
 * @returns {string|undefined} - The target domain, or undefined if not found.
 */
function getTargetDomain(host) {
  return domainMappings[host];
}

module.exports = {
  updateDomainMappings,
  getTargetDomain,
};

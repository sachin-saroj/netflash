/**
 * @file domains.js
 * @description Centralized configuration and helper logic for supported e-commerce platforms.
 */

const SUPPORTED_DOMAINS_MAP = {
  amazon: ['amazon.in', 'amazon.com'],
  flipkart: ['flipkart.com'],
  meesho: ['meesho.com']
};

const ALL_SUPPORTED_DOMAINS = Object.values(SUPPORTED_DOMAINS_MAP).flat();

/**
 * Checks if a hostname matches a given list of domains or their subdomains.
 *
 * @param {string} hostname - The hostname to check (e.g. 'www.amazon.in')
 * @param {string[]} platformDomains - The list of valid domains (e.g. ['amazon.in', 'amazon.com'])
 * @returns {boolean} True if matches, false otherwise.
 */
function matchesPlatform(hostname, platformDomains) {
  return platformDomains.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain)
  );
}

/**
 * Checks if a hostname is supported by any platform.
 *
 * @param {string} hostname - The hostname to check
 * @returns {boolean} True if supported, false otherwise.
 */
function isSupportedDomain(hostname) {
  return matchesPlatform(hostname, ALL_SUPPORTED_DOMAINS);
}

module.exports = {
  SUPPORTED_DOMAINS_MAP,
  ALL_SUPPORTED_DOMAINS,
  matchesPlatform,
  isSupportedDomain
};

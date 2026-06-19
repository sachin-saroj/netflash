const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * Delay helper for retry logic.
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Creates a pre-configured Axios client for a specific RapidAPI host.
 * This client injects the necessary keys and host headers on every request.
 *
 * @param {string} host - The RapidAPI host domain (e.g. 'real-time-flipkart-data2.p.rapidapi.com')
 * @returns {import('axios').AxiosInstance} Configured Axios instance
 */
function createRapidApiClient(host) {
  const client = axios.create({
    baseURL: `https://${host}`,
    timeout: 10000
  });

  // Inject keys dynamically at request time to support environment variable updates
  client.interceptors.request.use((config) => {
    config.headers['X-RapidAPI-Key'] = process.env.RAPIDAPI_KEY || '';
    config.headers['X-RapidAPI-Host'] = host;
    return config;
  });

  return client;
}

/**
 * Executes an Axios request with an automatic retry strategy for rate limits (429) or server errors (500).
 *
 * @param {import('axios').AxiosInstance} client - The pre-configured Axios instance to use
 * @param {import('axios').AxiosRequestConfig} config - Axios request config
 * @param {number} [retries=2] - Number of retry attempts
 * @returns {Promise<import('axios').AxiosResponse>}
 */
async function requestWithRetry(client, config, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await client(config);
    } catch (err) {
      const status = err.response?.status;
      const isRetryable = status === 429 || status === 500;
      
      if (isRetryable && attempt < retries) {
        const waitMs = (attempt + 1) * 2000;
        logger.warn('http-client', `RapidAPI request to ${config.url || ''} rate limited/failed (${status}), retrying in ${waitMs}ms...`, { attempt });
        await delay(waitMs);
        continue;
      }
      throw err;
    }
  }
}

module.exports = { createRapidApiClient, requestWithRetry };

import axios, { AxiosInstance, AxiosError } from 'axios';
import Bottleneck from 'bottleneck';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface FetchOptions {
  maxRetries?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  maxRetries: 3,
  timeout: config.scraper.timeout,
};

class ScraperClient {
  private axios: AxiosInstance;
  private limiter: Bottleneck;

  constructor() {
    this.axios = axios.create({
      baseURL: config.scraper.baseUrl,
      timeout: config.scraper.timeout,
      headers: {
        'User-Agent': 'TryTagStats/1.0 (Statistics aggregator)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    });

    // Rate limiter: max N requests per second
    this.limiter = new Bottleneck({
      maxConcurrent: 2,
      minTime: Math.ceil(1000 / config.scraper.rateLimit),
    });

    logger.info(`Scraper client initialized with rate limit: ${config.scraper.rateLimit} req/s`);
  }

  async fetch(url: string, options: FetchOptions = {}): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return this.limiter.schedule(async () => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
          logger.debug({ url, attempt }, 'Fetching URL');

          const response = await this.axios.get(url, {
            timeout: opts.timeout,
          });

          logger.debug({ url, status: response.status }, 'Fetch successful');
          return response.data as string;
        } catch (error) {
          lastError = error as Error;

          if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            // Don't retry on 4xx errors (except 429)
            if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500 && axiosError.response.status !== 429) {
              logger.error({ url, status: axiosError.response.status }, 'Client error, not retrying');
              throw error;
            }

            // Exponential backoff for retryable errors
            if (attempt < opts.maxRetries) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
              logger.warn({ url, attempt, delay, error: axiosError.message }, 'Retrying after delay');
              await this.sleep(delay);
            }
          }
        }
      }

      logger.error({ url, error: lastError?.message }, 'All retry attempts failed');
      throw lastError;
    });
  }

  async fetchWithParams(
    endpoint: string,
    params: Record<string, string | number>,
    options?: FetchOptions
  ): Promise<string> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      searchParams.append(key, String(value));
    }
    const url = `${endpoint}?${searchParams.toString()}`;
    return this.fetch(url, options);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const scraperClient = new ScraperClient();

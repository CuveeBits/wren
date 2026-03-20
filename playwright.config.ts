import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/rex',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3001',
    // Do NOT set Content-Type globally — DELETE/GET requests have no body
    // and Fastify rejects empty JSON body with 400 FST_ERR_CTP_EMPTY_JSON_BODY.
    // Each test that sends a body sets Content-Type explicitly.
  },
})

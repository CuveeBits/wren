import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Transpile internal workspace packages so Next.js handles their TypeScript
  transpilePackages: ['@wren/ui', '@wren/types', '@wren/channels', '@wren/llm', '@wren/agents'],

  // Strict CSP headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig

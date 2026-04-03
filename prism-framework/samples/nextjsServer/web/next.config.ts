import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Proxy /api requests to the Prism API server
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:19997/api/:path*',
      },
    ];
  },
};

export default nextConfig;

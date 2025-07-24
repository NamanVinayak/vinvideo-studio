import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Experimental features
  experimental: {
    // Remove deprecated reactRefresh option
  },
  // Disable HMR in development for error debugging
  ...(process.env.NODE_ENV === 'development' && {
    webpackDevMiddleware: (config: any) => {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/*'], // Effectively disable file watching
      };
      return config;
    },
  }),
  webpack: (config) => {
    // Exclude markdown files from being processed
    config.module.rules.push({
      test: /\.md$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    return config;
  },
};

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Lets the report route handler import packages/cli's report renderer
  // and types directly from source (see CLAUDE.md: "The same renderer
  // produces the local file and the hosted page").
  transpilePackages: ['tokendrift'],
};

export default nextConfig;

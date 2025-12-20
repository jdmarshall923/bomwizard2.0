import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standard build output (not static export)
  // This allows dynamic routes to work properly
  
  // Trailing slashes for consistent URL handling
  trailingSlash: true,
  
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Disable x-powered-by header for security
  poweredByHeader: false,
  
  // Compress output
  compress: true,
  
  // Generate source maps for production debugging
  productionBrowserSourceMaps: false,
  
  // Image optimization settings
  images: {
    // Using unoptimized for Firebase Hosting
    // Change to false if deploying to Vercel
    unoptimized: true,
  },
};

export default nextConfig;

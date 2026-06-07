import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Known-harmless warnings from wallet libraries' optional/dynamic deps
    // (React Native storage, pino's pretty printer, and dynamic requires
    // inside WalletConnect/Reown/ox). None affect a web build.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { message: /Can't resolve '@react-native-async-storage\/async-storage'/ },
      { message: /Can't resolve 'pino-pretty'/ },
      {
        message:
          /Critical dependency: the request of a dependency is an expression/,
      },
    ];
    return config;
  },
};

export default nextConfig;

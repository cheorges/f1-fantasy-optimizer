import type { NextConfig } from "next";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: pkg.version,
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import { BASE_PATH } from "./src/config/site";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: BASE_PATH,
};

export default nextConfig;

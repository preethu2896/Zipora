import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

const localAddresses = Object.values(networkInterfaces()).flatMap(addresses =>
  (addresses || []).filter(address => address.family === 'IPv4' && !address.internal).map(address => address.address)
);
const config: NextConfig = {
  output: 'export', trailingSlash: true, poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1', ...localAddresses],
};
export default config;

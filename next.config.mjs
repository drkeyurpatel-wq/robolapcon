/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yqyfmnemvedpqnkfraro.supabase.co',
      },
    ],
  },
};

export default nextConfig;

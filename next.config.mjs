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
  async redirects() {
    return [
      // Duplicate event landing → root. Sub-routes (register, pass, live, feedback) keep working.
      {
        source: '/robolapcon-2026',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

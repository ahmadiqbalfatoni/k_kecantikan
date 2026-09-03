/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/api/assets/:path*',
                destination: `${process.env.PUBLIC_ASSET_ORG || 'http://127.0.0.1:8000'}/:path*`,
            },
            {
                source: '/uploads/:path*',
                destination: `${process.env.PUBLIC_ASSET_ORG || 'http://127.0.0.1:8000'}/uploads/:path*`,
            },
        ];
    }
}

module.exports = nextConfig

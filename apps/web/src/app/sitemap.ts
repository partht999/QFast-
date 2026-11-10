import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://qfast.in';
  const paths = ['', '/restaurants', '/cafes', '/salons', '/clinics', '/diagnostics', '/service-centres', '/industries', '/features', '/about', '/contact', '/for-business'];
  return paths.map((path) => ({
    url: `${base}${path || '/'}`,
    changeFrequency: 'weekly',
    priority: path ? 0.7 : 1,
  }));
}

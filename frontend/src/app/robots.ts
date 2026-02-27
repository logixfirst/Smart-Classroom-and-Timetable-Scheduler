import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all crawlers on all marketing pages
        userAgent:  '*',
        allow:      '/',
        // Disallow app routes that should not be indexed
        disallow: ['/admin/', '/faculty/', '/student/', '/unauthorized/', '/login'],
      },
    ],
    sitemap: 'https://cadence.edu/sitemap.xml',
  }
}

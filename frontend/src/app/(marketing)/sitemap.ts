import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://cadence.edu'

  return [
    {
      url:          `${base}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority:     1.0,
    },
    {
      url:          `${base}/product`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority:     0.9,
    },
    {
      url:          `${base}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority:     0.9,
    },
    {
      url:          `${base}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority:     0.95,
    },
    {
      url:          `${base}/company`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority:     0.7,
    },
    {
      url:          `${base}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority:     0.8,
    },
    {
      url:          `${base}/blog/ai-timetabling-vs-manual`,
      lastModified: new Date('2026-02-12'),
      changeFrequency: 'never',
      priority:     0.7,
    },
    {
      url:          `${base}/blog/nep-2020-flexible-credits`,
      lastModified: new Date('2026-02-05'),
      changeFrequency: 'never',
      priority:     0.7,
    },
    {
      url:          `${base}/blog/zero-conflicts-with-cpsat`,
      lastModified: new Date('2026-01-28'),
      changeFrequency: 'never',
      priority:     0.7,
    },
    {
      url:          `${base}/blog/hidden-cost-manual-scheduling`,
      lastModified: new Date('2026-01-20'),
      changeFrequency: 'never',
      priority:     0.7,
    },
    {
      url:          `${base}/blog/substitution-management-problem`,
      lastModified: new Date('2026-01-14'),
      changeFrequency: 'never',
      priority:     0.7,
    },
    {
      url:          `${base}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority:     0.3,
    },
    {
      url:          `${base}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority:     0.3,
    },
  ]
}

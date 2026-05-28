import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/terms'],
      disallow: ['/admin/', '/supplier/', '/auth/', '/api/', '/payment/', '/_next/'],
    },
    sitemap: 'https://vendo.com.ng/sitemap.xml',
  }
}

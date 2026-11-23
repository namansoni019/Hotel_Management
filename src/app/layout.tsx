import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';
import { WhatsAppConcierge } from '@/components/layout/whatsapp-concierge';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rajmahal Heritage Hotel | A Royal Stay Rooted in Rajasthan',
  description:
    'Experience the royal heritage of Rajasthan at Rajmahal Heritage Hotel — authentic heritage suites, traditional Rajasthani restaurant, café & lounge, and celebrations hall in Udaipur.',
};

const hotelStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Hotel',
      '@id': 'https://rajmahalheritage.com/#hotel',
      name: 'Rajmahal Heritage Hotel & Resorts',
      description:
        'Experience the royal heritage of Rajasthan at Rajmahal Heritage Hotel — authentic heritage suites, traditional Rajasthani restaurant, café & lounge, and celebrations hall in Udaipur.',
      url: 'https://rajmahalheritage.com',
      telephone: '+91 294 242 8800',
      priceRange: '₹₹₹₹',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Rajmahal Palace Road, Lake Pichola Precinct',
        addressLocality: 'Udaipur',
        addressRegion: 'Rajasthan',
        postalCode: '313001',
        addressCountry: 'IN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 24.5764,
        longitude: 73.6835,
      },
      amenityFeature: [
        { '@type': 'LocationFeatureSpecification', name: 'Free Royal Wi-Fi', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Fine-Dining Restaurant', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Heritage Courtyard Pool', value: true },
        { '@type': 'LocationFeatureSpecification', name: '24-Hour Concierge', value: true },
      ],
      starRating: {
        '@type': 'Rating',
        ratingValue: '5',
      },
    },
    {
      '@type': 'Restaurant',
      '@id': 'https://rajmahalheritage.com/#restaurant',
      name: 'Rajmahal Royal Thali & Fine Rajasthani Dining',
      servesCuisine: ['Rajasthani', 'North Indian', 'Mughlai', 'Jain'],
      telephone: '+91 294 242 8801',
      priceRange: '₹₹₹',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Rajmahal Palace Road, Lake Pichola Precinct',
        addressLocality: 'Udaipur',
        addressRegion: 'Rajasthan',
        postalCode: '313001',
        addressCountry: 'IN',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelStructuredData) }}
        />
      </head>
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F1E8', color: '#241F1A' }} suppressHydrationWarning>
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
        <div className="relative mt-auto">
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
          <Suspense fallback={null}>
            <MobileNav />
          </Suspense>
          <Suspense fallback={null}>
            <WhatsAppConcierge />
          </Suspense>
        </div>
      </body>
    </html>
  );
}

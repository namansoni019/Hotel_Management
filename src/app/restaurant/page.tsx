import { Suspense } from 'react';
import { RestaurantPageClient } from '@/components/restaurant/restaurant-page-client';

export const metadata = {
  title: 'Restaurant & Café | Royal Rajasthani Dining & Courtyard Café | Rajmahal Heritage Hotel',
  description:
    'Experience imperial culinary heritage at Rajmahal Palace. Signature Rajasthani Thalis, artisan fast foods, South Indian delicacies, and single-origin brews served in royal ambience.',
};

export default function RestaurantPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center text-[#4F0809] font-heritage text-lg">
          Loading royal culinary experiences...
        </div>
      }
    >
      <RestaurantPageClient />
    </Suspense>
  );
}

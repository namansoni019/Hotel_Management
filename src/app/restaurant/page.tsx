import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { dataRepository } from '@/lib/data/repository';
import { menuService } from '@/lib/services/menu-service';
import { formatMoney } from '@/lib/utils/money';
import {
  HeritageDivider,
  LataJaaliRunner,
  RoyalProcessionBanner,
  PaisleyButaOrnament,
} from '@/components/ui/heritage-ornaments';
import {
  IconTraditionalCuisine,
  IconIndoorOutdoor,
  IconLiveFolkMusic,
  IconSpecialThali,
  IconCafeLounge,
} from '@/components/ui/heritage-art';
import { ArrowRight, QrCode, Clock, Coffee, UtensilsCrossed, Sparkles } from 'lucide-react';
import { RestaurantReservationCTA } from '@/components/restaurant/restaurant-reservation-cta';

export const metadata = {
  title: 'Restaurant & Café | Authentic Rajasthani Dining & Artisan Brews | Rajmahal Heritage Hotel',
  description:
    'Experience the culinary heritage of Rajasthan at our royal restaurant and Jharokha artisan café. Traditional royal recipes, thalis, single-origin coffees, and handcrafted delicacies.',
};

async function RestaurantAndCafeContent() {
  const restaurantOutlet = dataRepository.getOutletByType('restaurant')!;
  const cafeOutlet = dataRepository.getOutletByType('cafe')!;

  const [restaurantCategories, cafeCategories] = await Promise.all([
    menuService.getMenuCategories(restaurantOutlet?.id || ''),
    menuService.getMenuCategories(cafeOutlet?.id || ''),
  ]);

  const signatureDishes = [
    {
      name: 'Dal Baati Churma',
      image: '/images/food/dal-baati.jpg',
      desc: 'Golden crisp baati rolls drenched in desi ghee with spiced dal and sweet churma.',
    },
    {
      name: 'Laal Maas',
      image: '/images/food/laal-maas.jpg',
      desc: 'Royal Rajputana mutton simmered in Mathania red chillies and fragrant spices.',
    },
    {
      name: 'Gatte ki Sabzi',
      image: '/images/food/gatte-ki-sabzi.jpg',
      desc: 'Gram flour dumplings poached in an aromatic spiced curd gravy.',
    },
    {
      name: 'Ker Sangri',
      image: '/images/food/ker-sangri.jpg',
      desc: 'Authentic wild desert berries and dried beans cooked with dry mango and cumin.',
    },
  ];

  const restaurantFeatures = [
    { label: 'Traditional Rajasthani Cuisine', icon: IconTraditionalCuisine },
    { label: 'Indoor & Courtyard Seating', icon: IconIndoorOutdoor },
    { label: 'Live Folk Music (Evenings)', icon: IconLiveFolkMusic },
    { label: 'Royal Thali Feasts', icon: IconSpecialThali },
  ];

  const cafeFeatures = [
    { label: 'Artisan Udaipur Coffees', icon: IconCafeLounge },
    { label: 'Fresh Pastries & Quick Bites', icon: IconTraditionalCuisine },
    { label: 'Scenic Jharokha Seating', icon: IconIndoorOutdoor },
  ];

  return (
    <div className="relative bg-[#F5F1E8] min-h-screen pt-24 sm:pt-28 pb-14 text-[#241F1A] overflow-hidden">
      {/* ── BESPOKE VERTICAL LATA JAALI BORDERS ── */}
      <LataJaaliRunner side="left" opacity={0.15} color="#B08D57" className="hidden lg:block" />
      <LataJaaliRunner side="right" opacity={0.15} color="#B08D57" className="hidden lg:block" />

<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20">
        {/* ── TOP OUTLET SWITCHER & SUB-HEADER ── */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase text-[#9C7A45] block mb-1.5">
            Royal Gastronomy
          </span>
          <h1
            className="text-3xl sm:text-5xl font-bold text-[#4F0809] tracking-tight leading-tight mb-2.5"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            Culinary Experiences at Rajmahal
          </h1>

          {/* Diamond-Tipped Gold Rule */}
          <div className="flex items-center justify-center gap-2 w-40 sm:w-48 mx-auto mb-3.5">
            <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]/70" />
            <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
          </div>

          <p className="text-xs sm:text-base text-[#4F0809]/80 font-normal leading-relaxed mb-6">
            From imperial Rajasthani banquets at our traditional restaurant to relaxed artisanal brews at the Jharokha Café, indulge in authentic royal flavors.
          </p>

          {/* Quick-Jump Navigation Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <a
              href="#restaurant"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#4F0809] text-[#FFF8EB] hover:bg-[#680b0c] text-xs font-bold uppercase tracking-[0.12em] transition-colors"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#D8AA67]" />
              <span>Rajasthani Restaurant</span>
            </a>
            <a
              href="#cafe"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#FDF8EE] text-[#4F0809] hover:bg-[#F5ECDC] text-xs font-bold uppercase tracking-[0.12em] transition-colors"
            >
              <Coffee className="w-3.5 h-3.5 text-[#9C7A45]" />
              <span>Jharokha Café &amp; Lounge</span>
            </a>
            <RestaurantReservationCTA className="!rounded-full !px-5 !py-2.5 !bg-[#D8AA67]/25 hover:!bg-[#D8AA67]/45 !text-[#4F0809] !text-xs !font-bold !uppercase !tracking-[0.12em] !shadow-none !border-0" />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1: RAJASTHANI RESTAURANT
        ═══════════════════════════════════════════════════════════════ */}
        <section id="restaurant" className="space-y-12 sm:space-y-14 scroll-mt-24">
          {/* ── 1. RESTAURANT HERO BANNER ── */}
          <div className="relative h-[400px] sm:h-[480px] rounded-t-3xl rounded-b-2xl overflow-hidden bg-[#3B0507]">
            <Image
              src="/images/food/restaurant.jpg"
              alt="Rajasthani Restaurant at Rajmahal Heritage Hotel"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2B0507]/90 via-[#2B0507]/55 to-[#2B0507]/30 flex items-center justify-center p-6 sm:p-12 text-center">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F0809]/95 text-[#F7E5C3] text-[10px] font-bold tracking-[0.22em] uppercase mb-3">
                  <span className="w-1 h-1 rounded-full bg-[#D8AA67]" />
                  Fine Dining &amp; Thali
                </span>
                <h2
                  className="text-3xl sm:text-5xl font-bold text-[#FFF8EB] mb-2 leading-tight"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  Rajasthani Restaurant
                </h2>
                <p className="text-base sm:text-xl font-medium text-[#D8AA67] mb-3">
                  Authentic Flavors, Royal Ambience
                </p>
                <p className="text-xs sm:text-base text-[#FFF8EB]/85 max-w-2xl mx-auto font-light leading-relaxed mb-6">
                  Experience the true taste of Rajasthan with traditional recipes, fresh local ingredients, and a regal heritage dining atmosphere.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="#restaurant-menu"
                    className="px-6 py-3 rounded-full bg-[#D8AA67] hover:bg-[#C99A52] text-[#3B0507] font-bold text-xs uppercase tracking-[0.14em] transition-colors"
                  >
                    View Restaurant Menu
                  </a>
                  <RestaurantReservationCTA
                    className="!rounded-full !px-6 !py-3 !bg-[#4F0809] hover:!bg-[#680b0c] !text-[#FFF8EB] !text-xs !font-bold !uppercase !tracking-[0.14em] !shadow-none !border-0"
                  />
                  <Link
                    href="/qr/table-t01"
                    className="px-5 py-3 rounded-full bg-[#FDF8EE]/15 hover:bg-[#FDF8EE]/25 text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.12em] backdrop-blur-sm inline-flex items-center space-x-1.5 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#D8AA67]" />
                    <span>Dine-In QR</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4 RESTAURANT FEATURES ROW ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5 text-center">
            {restaurantFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-t-3xl rounded-b-xl bg-[#FDF8EE] hover:bg-[#F5ECDC] transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-[#F5ECDC] flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-[#9C7A45]" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[#4F0809] max-w-[165px] leading-snug">
                    {feat.label}
                  </h4>
                </div>
              );
            })}
          </div>

          {/* Symmetrical Jaali Divider */}
          <HeritageDivider className="opacity-35" color="#B08D57" />

          {/* ── SIGNATURE DISHES ── */}
          <div className="space-y-8 text-center">
            <div className="max-w-xl mx-auto">
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase text-[#9C7A45] block mb-1">
                Royal Kitchen Specialties
              </span>
              <h3
                className="text-2xl sm:text-4xl font-bold text-[#4F0809] mb-2"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                Our Signature Dishes
              </h3>
              <p className="text-xs sm:text-sm text-[#6B533B] font-normal">
                Centuries-old royal recipes crafted by our khansama masters
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {signatureDishes.map((dish, idx) => (
                <div
                  key={idx}
                  className="bg-[#FDF8EE] rounded-t-3xl rounded-b-xl p-5 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group"
                >
                  <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-[#EFE6D5] mb-4 group-hover:scale-105 transition-transform duration-300">
                    <Image
                      src={dish.image}
                      alt={dish.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h4
                    className="text-lg sm:text-xl font-bold text-[#4F0809] mb-1.5 group-hover:text-[#9C7A45] transition-colors"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    {dish.name}
                  </h4>
                  <p className="text-xs text-[#6B533B] leading-relaxed font-normal">
                    {dish.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── DINE LIKE ROYALTY BANNER ── */}
          <div className="relative bg-[#3B0507] text-[#FDF8EE] rounded-t-3xl rounded-b-2xl overflow-hidden p-8 sm:p-12 text-center">
            <div className="relative z-10 max-w-4xl mx-auto space-y-4">
              <span className="text-[#D8AA67] text-[10px] sm:text-xs font-bold tracking-[0.26em] uppercase block">
                &#9830; Shahi Sawari &amp; Royal Feasts &#9830;
              </span>
              <h3
                className="text-2xl sm:text-4xl font-bold text-[#FDF8EE] tracking-wide"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                Dine Like Royalty
              </h3>
              <p className="text-[#FDF8EE]/80 text-xs sm:text-sm max-w-2xl mx-auto font-light leading-relaxed">
                A culinary journey through the rich heritage of Rajasthan, served in a regal setting with recipes passed down through royal palace kitchens.
              </p>

              <div className="pt-2 pb-2">
                <RoyalProcessionBanner color="#D8AA67" opacity={0.45} />
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <Link
                  href="/order/pickup"
                  className="px-6 py-3 rounded-full bg-[#D8AA67] hover:bg-[#C99A52] text-[#3B0507] font-bold text-xs uppercase tracking-[0.14em] transition-colors"
                >
                  Order Direct
                </Link>
                <a
                  href="#restaurant-menu"
                  className="px-6 py-3 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FDF8EE] text-xs font-bold uppercase tracking-[0.14em] transition-colors"
                >
                  Explore Delicacies
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            DIVIDER BETWEEN RESTAURANT & CAFE
        ═══════════════════════════════════════════════════════════════ */}
        <div className="py-2">
          <HeritageDivider className="opacity-45" color="#B08D57" />
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2: JHAROKHA CAFÉ & LOUNGE
        ═══════════════════════════════════════════════════════════════ */}
        <section id="cafe" className="space-y-12 sm:space-y-14 scroll-mt-24">
          {/* ── CAFÉ HERO BANNER ── */}
          <div className="relative h-[380px] sm:h-[460px] rounded-t-3xl rounded-b-2xl overflow-hidden bg-[#3B0507]">
            <Image
              src="/images/food/cafe.jpg"
              alt="Jharokha Café & Lounge at Rajmahal Heritage Hotel"
              fill
              className="object-cover"
            />

            {/* Paisley Buta Ornaments in Corners */}
            <div className="absolute top-2 left-2 pointer-events-none hidden sm:block">
              <PaisleyButaOrnament size="180px" opacity={0.15} color="#C9A96E" />
            </div>
            <div className="absolute top-2 right-2 pointer-events-none hidden sm:block scale-x-[-1]">
              <PaisleyButaOrnament size="180px" opacity={0.15} color="#C9A96E" />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-[#2B0507]/90 via-[#2B0507]/55 to-[#2B0507]/30 flex items-center justify-center p-6 sm:p-12 text-center">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F0809]/95 text-[#F7E5C3] text-[10px] font-bold tracking-[0.22em] uppercase mb-3">
                  <span className="w-1 h-1 rounded-full bg-[#D8AA67]" />
                  Artisan Brews &amp; Light Delicacies
                </span>
                <h2
                  className="text-3xl sm:text-5xl font-bold text-[#FFF8EB] mb-2 leading-tight"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  Jharokha Café &amp; Lounge
                </h2>
                <p className="text-base sm:text-xl font-medium text-[#D8AA67] mb-3">
                  Relax, Sip, Soak in the Heritage.
                </p>
                <p className="text-xs sm:text-sm text-[#FFF8EB]/85 max-w-xl mx-auto font-light leading-relaxed mb-4">
                  A cozy courtyard space to enjoy freshly brewed single-origin coffees, royal saffron chai, delicate pastries, and a relaxed ambience overlooking palace gardens.
                </p>
                <div className="inline-flex items-center space-x-2 text-[11px] font-semibold text-[#F7E5C3] bg-[#4F0809]/90 px-4 py-1.5 rounded-full mb-6">
                  <Clock className="w-3.5 h-3.5 text-[#D8AA67]" />
                  <span>Open Daily: 8:00 AM – 11:00 PM</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href="#cafe-menu"
                    className="px-6 py-3 rounded-full bg-[#D8AA67] hover:bg-[#C99A52] text-[#3B0507] font-bold text-xs uppercase tracking-[0.14em] transition-colors"
                  >
                    View Café Menu
                  </a>
                  <RestaurantReservationCTA
                    venue="cafe"
                    label="Reserve Café Table"
                    className="!rounded-full !px-6 !py-3 !bg-[#4F0809] hover:!bg-[#680b0c] !text-[#FFF8EB] !text-xs !font-bold !uppercase !tracking-[0.14em] !shadow-none !border-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── 3 CAFÉ FEATURES ROW ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 max-w-3xl mx-auto text-center">
            {cafeFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-5 rounded-t-3xl rounded-b-xl bg-[#FDF8EE] hover:bg-[#F5ECDC] transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-[#F5ECDC] flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-[#9C7A45]" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[#4F0809]">
                    {feat.label}
                  </h4>
                </div>
              );
            })}
          </div>

        </section>
      </div>
    </div>
  );
}

export default function RestaurantPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center text-[#670E10] font-heritage text-lg">
          Loading royal culinary experiences...
        </div>
      }
    >
      <RestaurantAndCafeContent />
    </Suspense>
  );
}

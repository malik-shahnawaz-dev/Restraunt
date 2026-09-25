import Hero from '../components/home/Hero.jsx'
import {
  AboutPreview,
  ChefFavorites,
  ContactSection,
  FeaturedCategories,
  GalleryPreview,
  ReservationSection,
  ReviewsSection,
  ValueBand,
} from '../components/home/HomeSections.jsx'

export default function Home() {
  return (
    <>
      <Hero />
      <ValueBand />
      <FeaturedCategories />
      <ChefFavorites />
      <AboutPreview />
      <GalleryPreview />
      <ReviewsSection />
      <ReservationSection />
      <ContactSection />
    </>
  )
}

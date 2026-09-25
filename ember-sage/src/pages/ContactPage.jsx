import { useEffect } from 'react'
import PageHeader from '../components/layout/PageHeader.jsx'
import { ContactSection, ReservationSection } from '../components/home/HomeSections.jsx'
import Button from '../components/ui/Button.jsx'
import { Link } from 'react-router-dom'

export default function ContactPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Find Us & Say Hello"
        subtitle="F-7 Markaz, Islamabad — dine in, order out, or plan something special."
      >
        <Link to="/reservations">
          <Button size="lg">Reserve a Table</Button>
        </Link>
      </PageHeader>
      <ContactSection />
    </>
  )
}

export function ReservationsPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <>
      <PageHeader
        eyebrow="Reservations"
        title="Book Your Table"
        subtitle="Instant requests, human confirmation — your table waiting when you arrive."
        dark
      />
      <ReservationSection />
    </>
  )
}

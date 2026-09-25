import { useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { motion } from 'framer-motion'
import { GALLERY } from '../data/site.js'
import { useData } from '../context/MenuContext.jsx'

const BASE_FILTERS = ['All', 'Food', 'Interior', 'Chef', 'Kitchen', 'Atmosphere', 'Drinks']

export default function GalleryPage() {
  const { gallery, menuLoading } = useData()
  const [filter, setFilter] = useState('All')
  const [lightbox, setLightbox] = useState(null)

  const shots = gallery.length ? gallery : GALLERY
  const FILTERS = BASE_FILTERS.filter((f) => f === 'All' || shots.some((g) => (g.category || g.tag) === f))
  const visible = shots.filter((g) => filter === 'All' || (g.category || g.tag) === filter)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="Gallery"
        title="Scenes from the House"
        subtitle="Food, rooms, hands at work — a look at everyday life inside Ember & Sage."
      >
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0" role="tablist" aria-label="Gallery filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-medium transition ${
                filter === f ? 'bg-ink text-cream' : 'bg-white text-ink-600 shadow-soft hover:bg-beige'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </PageHeader>

      <section className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10 lg:pb-28" aria-label="Photo gallery">
        {menuLoading && shots.length === 0 ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-64 rounded-card" />
            ))}
          </div>
        ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {visible.map((g, i) => (
            <motion.button
              key={g._id || g.id}
              type="button"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setLightbox(g)}
              className="group relative block w-full cursor-pointer overflow-hidden rounded-card break-inside-avoid text-left shadow-soft"
              aria-label={`View image: ${g.title || g.alt}`}
            >
              <img
                src={g.image || g.src}
                alt={g.title || g.alt}
                loading="lazy"
                className="w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]"
              />
              <span className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                <span className="m-4 rounded-full bg-cream/95 px-3.5 py-1.5 text-[12px] font-semibold text-ink">
                  {g.category || g.tag} · View
                </span>
              </span>
            </motion.button>
          ))}
        </div>
        )}
      </section>

      <Modal
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        size="lg"
        title={lightbox?.title || lightbox?.alt || 'Gallery image'}
      >
        {lightbox && (
          <figure className="p-3 sm:p-5">
            <img
              src={lightbox.image || lightbox.src}
              alt={lightbox.title || lightbox.alt}
              className="max-h-[72vh] w-full rounded-xl object-contain"
            />
            <figcaption className="mt-4 flex items-center justify-between gap-4 px-1 pb-1">
              <span className="text-[14px] font-medium text-ink">{lightbox.caption || lightbox.title || lightbox.alt}</span>
              <span className="rounded-full bg-beige px-3 py-1 text-[11.5px] font-semibold tracking-wide text-ink-600 uppercase">
                {lightbox.category || lightbox.tag}
              </span>
            </figcaption>
          </figure>
        )}
      </Modal>
    </>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Images,
  Inbox,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  ScrollText,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { AdminPageHead, StatCard } from './AdminLayout.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { EmptyState, Reveal, Spinner } from '../../components/ui/Motion.jsx'
import { Input, Select, Textarea } from '../../components/ui/Input.jsx'
import { api } from '../../lib/api.js'
import { useToast } from '../../context/ToastContext.jsx'
import { useData } from '../../context/MenuContext.jsx'

const GROUP_LABELS = { home: 'Home page', about: 'About page', pages: 'Standalone pages', site: 'Site-wide' }

/* ═════════════════════════ Content blocks ═════════════════════════ */

export function AdminContent() {
  const toast = useToast()
  const { refreshContent } = useData()
  const [blocks, setBlocks] = useState(null)
  const [activeKey, setActiveKey] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dataText, setDataText] = useState('')
  const [dataError, setDataError] = useState('')

  const load = useCallback(() => {
    api
      .get('/admin/content')
      .then((d) => {
        setBlocks(d.blocks || [])
        setActiveKey((current) => current || d.blocks?.[0]?.key || null)
      })
      .catch((e) => toast.error('Could not load content', e.message))
  }, [toast])

  useEffect(load, [load])

  const active = blocks?.find((b) => b.key === activeKey)

  useEffect(() => {
    if (!active) return
    setForm({
      eyebrow: active.eyebrow || '',
      title: active.title || '',
      subtitle: active.subtitle || '',
      body: active.body || '',
      image: active.image || '',
      ctaLabel: active.ctaLabel || '',
      ctaHref: active.ctaHref || '',
      active: active.active !== false,
    })
    setDataText(JSON.stringify(active.data || {}, null, 2))
    setDataError('')
  }, [activeKey, active?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e?.preventDefault()
    if (!form) return
    let parsed
    try {
      parsed = dataText.trim() ? JSON.parse(dataText) : {}
    } catch {
      setDataError('That JSON is not valid — fix it and try again.')
      return
    }
    setSaving(true)
    try {
      const d = await api.put(`/admin/content/${activeKey}`, { ...form, data: parsed })
      toast.success('Content saved', 'The storefront now shows your changes.')
      load()
      refreshContent()
      setDataError('')
    } catch (err) {
      toast.error('Save failed', err.message)
    } finally {
      setSaving(false)
    }
  }

  const restoreDefaults = async () => {
    try {
      const d = await api.post('/admin/content/restore-defaults', {})
      setBlocks(d.blocks || [])
      toast.success('Defaults restored', 'Every block is back to its factory copy.')
      refreshContent()
    } catch (e) {
      toast.error('Restore failed', e.message)
    }
  }

  if (!blocks) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size={30} />
      </div>
    )
  }

  const grouped = blocks.reduce((acc, block) => {
    const group = block.group || 'site'
    acc[group] = acc[group] || []
    acc[group].push(block)
    return acc
  }, {})

  return (
    <>
      <AdminPageHead
        title="Site content"
        subtitle="Every headline, image and stat on the storefront — editable here, live instantly."
        action={
          <Button variant="outline" size="sm" onClick={restoreDefaults}>
            <RotateCcw size={14} /> Restore defaults
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="rounded-card border border-ink/6 bg-white p-3 shadow-soft">
          <p className="px-2 pt-1 pb-2 text-[11px] font-semibold tracking-[0.16em] text-warm uppercase">Content blocks</p>
          <div className="max-h-[65vh] overflow-y-auto pr-1">
            {Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="mb-3">
                <p className="px-2 pb-1 text-[10.5px] font-semibold tracking-[0.14em] text-warm-light uppercase">
                  {GROUP_LABELS[group] || group}
                </p>
                {list.map((block) => (
                  <button
                    key={block.key}
                    type="button"
                    onClick={() => setActiveKey(block.key)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition ${
                      activeKey === block.key ? 'bg-clay-soft font-semibold text-clay-dark' : 'text-ink-600 hover:bg-beige'
                    }`}
                  >
                    <span className="truncate">{block.title || block.key}</span>
                    {block.active === false && <Badge tone="neutral" size="xs">off</Badge>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {active && form ? (
          <form onSubmit={save} className="rounded-card border border-ink/6 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-medium">{active.title || active.key}</h2>
                <p className="mt-0.5 font-mono text-[12px] text-warm">{active.key}</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-medium text-ink-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 accent-[#C0522F]"
                />
                Visible on site
              </label>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Eyebrow" value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} />
              <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input label="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="sm:col-span-2" />
              <ImageField
                label="Image"
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                className="sm:col-span-2"
              />
              <Input label="Button label" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
              <Input label="Button link" value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} placeholder="/menu" />
              <Textarea
                label="Body copy"
                rows={3}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="sm:col-span-2"
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Structured data (JSON)"
                  rows={10}
                  value={dataText}
                  onChange={(e) => setDataText(e.target.value)}
                  error={dataError}
                  hint="Stats, lists of items, slide decks — anything the section loops over."
                  className="font-mono text-[12.5px]"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              <span className="text-[12.5px] text-warm">
                Last update: {active.updatedAt ? new Date(active.updatedAt).toLocaleString() : '—'}
                {active.updatedBy ? ` · ${active.updatedBy}` : ''}
              </span>
            </div>
          </form>
        ) : (
          <div className="rounded-card border border-ink/6 bg-white p-10 shadow-soft">
            <EmptyState icon={FileText} title="Pick a block" message="Select a content block on the left to edit what the storefront shows." />
          </div>
        )}
      </div>
    </>
  )
}

/** Text input + upload button + preview, shared by the CMS editors. */
export function ImageField({ label, value, onChange, className = '' }) {
  const toast = useToast()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    const body = new FormData()
    body.append('image', file)
    try {
      const d = await api.upload('/admin/media', body)
      onChange(d.asset.url)
      toast.success('Uploaded', 'Image added to the media library.')
    } catch (e) {
      toast.error('Upload failed', e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <Input label={label} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="/images/hero.jpg" />
      <div className="mt-2 flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
          aria-label={`Upload ${label}`}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload size={14} /> {busy ? 'Uploading…' : 'Upload image'}
        </Button>
        {value ? (
          <img src={value} alt="" className="h-10 w-16 rounded-md border border-ink/8 object-cover" />
        ) : (
          <span className="text-[12.5px] text-warm">No image</span>
        )}
      </div>
    </div>
  )
}

/* ═════════════════════════ Gallery ═════════════════════════ */

export function AdminGallery() {
  const toast = useToast()
  const { refreshGallery } = useData()
  const [items, setItems] = useState(null)
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => {
    api
      .get('/admin/gallery')
      .then((d) => setItems(d.gallery || []))
      .catch((e) => toast.error('Could not load gallery', e.message))
  }, [toast])

  useEffect(load, [load])

  const remove = async (item) => {
    try {
      await api.del(`/admin/gallery/${item._id}`)
      toast.success('Photo removed', item.title)
      load()
      refreshGallery()
    } catch (e) {
      toast.error('Delete failed', e.message)
    }
  }

  const toggle = async (item) => {
    try {
      await api.put(`/admin/gallery/${item._id}`, { active: !item.active })
      load()
      refreshGallery()
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  return (
    <>
      <AdminPageHead
        title="Gallery"
        subtitle="Photos shown in the home gallery strip and on the public gallery page."
        action={
          <Button size="sm" onClick={() => setEditing({ title: '', caption: '', image: '', category: 'Food', sortOrder: 0, active: true })}>
            <Plus size={15} /> Add photo
          </Button>
        }
      />

      {!items ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner size={28} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-card border border-ink/6 bg-white p-10 shadow-soft">
          <EmptyState icon={Images} title="No photos yet" message="Add your first photo and it will appear on the storefront immediately." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={item._id} delay={i * 0.04} className="overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft">
              <div className="relative aspect-[4/3] bg-beige">
                <img src={item.image || '/images/kitchen.jpg'} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                {!item.active && <Badge tone="neutral" size="xs" className="absolute top-2 left-2">Hidden</Badge>}
              </div>
              <div className="p-4">
                <p className="truncate text-[14px] font-semibold text-ink">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] text-warm">{item.caption || '—'}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge tone="olive" size="xs">{item.category}</Badge>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      aria-label={item.active ? 'Hide photo' : 'Show photo'}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-500 transition hover:bg-beige"
                    >
                      <Check size={15} className={item.active ? 'text-success' : 'text-warm-light'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      aria-label="Edit photo"
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-500 transition hover:bg-beige"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      aria-label="Delete photo"
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-500 transition hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <GalleryModal
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
          refreshGallery()
        }}
      />
    </>
  )
}

function GalleryModal({ item, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(item || {})
  const [saving, setSaving] = useState(false)

  if (!item) return null

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (key === '_id' || key === 'createdAt' || key === 'updatedAt' || key === '__v') return
        body.append(key, String(value))
      })
      if (item._id) await api.upload(`/admin/gallery/${item._id}`, body, 'PUT')
      else await api.upload('/admin/gallery', body)
      toast.success(item._id ? 'Photo updated' : 'Photo added', 'The gallery updated on the site.')
      onSaved()
    } catch (err) {
      toast.error('Save failed', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={item._id ? 'Edit photo' : 'Add photo'}>
      <form onSubmit={save} className="space-y-4 p-5">
        <Input label="Title" required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea label="Caption" rows={2} value={form.caption || ''} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
        <ImageField label="Image" value={form.image || ''} onChange={(url) => setForm({ ...form, image: url })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" value={form.category || 'Food'} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['Food', 'Interior', 'Chef', 'Kitchen', 'Atmosphere', 'Drinks'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Input label="Sort order" type="number" value={String(form.sortOrder ?? 0)} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
        </div>
        <label className="flex items-center gap-2 text-[13.5px] font-medium text-ink-600">
          <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-[#C0522F]" />
          Visible on the site
        </label>
        <div className="flex justify-end gap-2.5 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save photo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ═════════════════════════ FAQs ═════════════════════════ */

export function AdminFaqs() {
  const toast = useToast()
  const { refreshFaqs } = useData()
  const [faqs, setFaqs] = useState(null)
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => {
    api
      .get('/admin/faqs')
      .then((d) => setFaqs(d.faqs || []))
      .catch((e) => toast.error('Could not load FAQs', e.message))
  }, [toast])

  useEffect(load, [load])

  const remove = async (faq) => {
    try {
      await api.del(`/admin/faqs/${faq._id}`)
      toast.success('FAQ deleted')
      load()
      refreshFaqs()
    } catch (e) {
      toast.error('Delete failed', e.message)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    try {
      if (editing._id) await api.put(`/admin/faqs/${editing._id}`, editing)
      else await api.post('/admin/faqs', editing)
      toast.success(editing._id ? 'FAQ updated' : 'FAQ added', 'Live on the contact page.')
      setEditing(null)
      load()
      refreshFaqs()
    } catch (err) {
      toast.error('Save failed', err.message)
    }
  }

  return (
    <>
      <AdminPageHead
        title="FAQs"
        subtitle="Answers shown on the contact page — keep them short and reassuring."
        action={
          <Button size="sm" onClick={() => setEditing({ question: '', answer: '', category: 'General', sortOrder: (faqs?.length || 0) + 1, active: true })}>
            <Plus size={15} /> Add FAQ
          </Button>
        }
      />

      {!faqs ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Reveal key={faq._id} delay={i * 0.03} className="rounded-card border border-ink/6 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold text-ink">{faq.question}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-warm">{faq.answer}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Badge tone="olive" size="xs">{faq.category}</Badge>
                    <Badge tone={faq.active ? 'success' : 'neutral'} size="xs">{faq.active ? 'Published' : 'Hidden'}</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(faq)}
                    aria-label="Edit FAQ"
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-500 transition hover:bg-beige"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(faq)}
                    aria-label="Delete FAQ"
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-500 transition hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
          {faqs.length === 0 && (
            <div className="rounded-card border border-ink/6 bg-white p-10 shadow-soft">
              <EmptyState icon={HelpCircle} title="No FAQs yet" message="Add answers to the questions your guests ask most." />
            </div>
          )}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? 'Edit FAQ' : 'Add FAQ'}>
        {editing && (
          <form onSubmit={save} className="space-y-4 p-5">
            <Input label="Question" required value={editing.question || ''} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
            <Textarea label="Answer" required rows={4} value={editing.answer || ''} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" value={editing.category || 'General'} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {['General', 'Orders', 'Delivery', 'Payments', 'Reservations', 'Kitchen'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Input
                label="Sort order"
                type="number"
                value={String(editing.sortOrder ?? 0)}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
              />
            </div>
            <label className="flex items-center gap-2 text-[13.5px] font-medium text-ink-600">
              <input
                type="checkbox"
                checked={editing.active !== false}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                className="h-4 w-4 accent-[#C0522F]"
              />
              Published
            </label>
            <div className="flex justify-end gap-2.5 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Save FAQ</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

/* ═════════════════════════ Subscribers ═════════════════════════ */

export function AdminSubscribers() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [query, setQuery] = useState('')

  const load = useCallback(() => {
    api
      .get('/admin/subscribers')
      .then(setData)
      .catch((e) => toast.error('Could not load subscribers', e.message))
  }, [toast])

  useEffect(load, [load])

  const filtered = useMemo(
    () => (data?.subscribers || []).filter((s) => s.email.toLowerCase().includes(query.toLowerCase())),
    [data, query],
  )

  const remove = async (subscriber) => {
    try {
      await api.del(`/admin/subscribers/${subscriber._id}`)
      toast.success('Subscriber removed', subscriber.email)
      load()
    } catch (e) {
      toast.error('Delete failed', e.message)
    }
  }

  const toggle = async (subscriber) => {
    try {
      await api.patch(`/admin/subscribers/${subscriber._id}`, { active: !subscriber.active })
      load()
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  return (
    <>
      <AdminPageHead title="Newsletter" subtitle="Everyone who subscribed from the footer or checkout." />

      {!data ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner size={28} />
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <StatCard label="Subscribers" value={String(data.total || 0)} icon={Users} delay={0} />
            <StatCard label="Active" value={String(data.active || 0)} icon={Mail} delay={0.06} />
            <StatCard
              label="Unsubscribed"
              value={String((data.total || 0) - (data.active || 0))}
              icon={Mail}
              delay={0.12}
              deltaTone="down"
            />
          </div>

          <div className="rounded-card border border-ink/6 bg-white shadow-soft">
            <div className="border-b border-ink/8 p-4">
              <Input placeholder="Search by email…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {filtered.length === 0 ? (
              <div className="p-10">
                <EmptyState icon={Mail} title="No subscribers" message="Signups from the footer newsletter form land here." />
              </div>
            ) : (
              <ul className="divide-y divide-ink/5">
                {filtered.map((subscriber) => (
                  <li key={subscriber._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-[14px] font-medium text-ink">{subscriber.email}</p>
                      <p className="text-[12.5px] text-warm">
                        {subscriber.source} · {new Date(subscriber.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={subscriber.active ? 'success' : 'neutral'} size="xs">
                        {subscriber.active ? 'Subscribed' : 'Unsubscribed'}
                      </Badge>
                      <Button variant="outline" size="xs" onClick={() => toggle(subscriber)}>
                        {subscriber.active ? 'Unsubscribe' : 'Resubscribe'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => remove(subscriber)}
                        aria-label="Delete subscriber"
                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-500 transition hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  )
}

/* ═════════════════════════ Contact inbox ═════════════════════════ */

export function AdminMessages() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)

  const load = useCallback(() => {
    api
      .get('/admin/messages')
      .then(setData)
      .catch((e) => toast.error('Could not load the inbox', e.message))
  }, [toast])

  useEffect(load, [load])

  const setStatus = async (message, status) => {
    try {
      await api.patch(`/admin/messages/${message._id}`, { status })
      toast.success(status === 'archived' ? 'Archived' : 'Marked as read', message.email)
      load()
    } catch (e) {
      toast.error('Update failed', e.message)
    }
  }

  const remove = async (message) => {
    try {
      await api.del(`/admin/messages/${message._id}`)
      toast.success('Enquiry deleted')
      setOpen(null)
      load()
    } catch (e) {
      toast.error('Delete failed', e.message)
    }
  }

  const messages = (data?.messages || []).filter((m) => filter === 'all' || m.status === filter)

  return (
    <>
      <AdminPageHead
        title="Inbox"
        subtitle="Enquiries from the contact form — reply by email, then archive them here."
        action={
          <div className="flex gap-2">
            {['all', 'new', 'read', 'archived'].map((key) => (
              <Button key={key} size="sm" variant={filter === key ? 'dark' : 'outline'} onClick={() => setFilter(key)}>
                {key} {data?.counts?.[key] ? `(${data.counts[key]})` : ''}
              </Button>
            ))}
          </div>
        }
      />

      {!data ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner size={28} />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-card border border-ink/6 bg-white p-10 shadow-soft">
          <EmptyState icon={Inbox} title="Inbox zero" message="New enquiries from the contact form will land here." />
        </div>
      ) : (
        <ul className="divide-y divide-ink/5 overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft">
          {messages.map((message) => (
            <li key={message._id}>
              <button
                type="button"
                onClick={() => setOpen(message._id === open ? null : message._id)}
                className="flex w-full cursor-pointer items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-beige/60"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                    {message.name}
                    {message.status === 'new' && <Badge tone="clay" size="xs">New</Badge>}
                  </p>
                  <p className="truncate text-[13px] text-warm">{message.email}</p>
                  <p className="mt-1 line-clamp-1 text-[13.5px] text-ink-600">{message.message}</p>
                </div>
                <span className="shrink-0 text-[12px] text-warm">
                  {new Date(message.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </button>
              {open === message._id && (
                <div className="border-t border-ink/6 bg-beige/40 px-5 py-4">
                  <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-600">{message.message}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <a href={`mailto:${message.email}`} className="text-[13px] font-medium text-clay hover:underline">
                      Reply by email →
                    </a>
                    {message.status !== 'read' && (
                      <Button size="xs" variant="outline" onClick={() => setStatus(message, 'read')}>
                        Mark read
                      </Button>
                    )}
                    {message.status !== 'archived' && (
                      <Button size="xs" variant="outline" onClick={() => setStatus(message, 'archived')}>
                        Archive
                      </Button>
                    )}
                    <Button size="xs" variant="ghost" onClick={() => remove(message)}>
                      Delete
                    </Button>
                    {message.handledBy && <span className="text-[12px] text-warm">Handled by {message.handledBy}</span>}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/* ═════════════════════════ Media library ═════════════════════════ */

export function AdminMedia() {
  const toast = useToast()
  const [assets, setAssets] = useState(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const load = useCallback(() => {
    api
      .get('/admin/media')
      .then((d) => setAssets(d.assets || []))
      .catch((e) => toast.error('Could not load media', e.message))
  }, [toast])

  useEffect(load, [load])

  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    const body = new FormData()
    body.append('image', file)
    try {
      await api.upload('/admin/media', body)
      toast.success('Uploaded', file.name)
      load()
    } catch (e) {
      toast.error('Upload failed', e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (asset) => {
    try {
      await api.del(`/admin/media/${asset._id}`)
      toast.success('Asset deleted')
      load()
    } catch (e) {
      toast.error('Delete failed', e.message)
    }
  }

  return (
    <>
      <AdminPageHead
        title="Media library"
        subtitle="Images uploaded here can be used for dishes, gallery photos and content blocks."
        action={
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload size={15} /> {busy ? 'Uploading…' : 'Upload'}
          </Button>
        }
      />
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} aria-label="Upload media" />

      {!assets ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner size={28} />
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-card border border-ink/6 bg-white p-10 shadow-soft">
          <EmptyState icon={ImageIcon} title="No uploads yet" message="Upload images to reuse them across the menu, gallery and content blocks." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {assets.map((asset, i) => (
            <Reveal key={asset._id} delay={i * 0.03} className="overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft">
              <img src={asset.url} alt={asset.originalName || 'Upload'} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="p-3.5">
                <p className="truncate text-[13px] font-medium text-ink">{asset.originalName || asset.filename}</p>
                <p className="mt-0.5 truncate font-mono text-[11.5px] text-warm">{asset.url}</p>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[11.5px] text-warm">
                    {asset.size ? `${Math.round(asset.size / 1024)} KB` : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(asset)}
                    aria-label="Delete asset"
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-ink-500 transition hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </>
  )
}

/* ═════════════════════════ Audit log ═════════════════════════ */

export function AdminActivity() {
  const toast = useToast()
  const [logs, setLogs] = useState(null)

  useEffect(() => {
    api
      .get('/admin/audit-logs?limit=150')
      .then((d) => setLogs(d.logs || []))
      .catch((e) => toast.error('Could not load activity', e.message))
  }, [toast])

  return (
    <>
      <AdminPageHead title="Activity log" subtitle="Every change made from this admin panel, with who made it." />
      {!logs ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner size={28} />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-card border border-ink/6 bg-white p-10 shadow-soft">
          <EmptyState icon={ScrollText} title="Nothing logged yet" message="Admin actions will appear here as they happen." />
        </div>
      ) : (
        <ul className="divide-y divide-ink/5 overflow-hidden rounded-card border border-ink/6 bg-white shadow-soft">
          {logs.map((log) => (
            <li key={log._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-ink">
                  <span className="text-clay">{log.action}</span> · {log.entity} — {log.summary}
                </p>
                <p className="text-[12px] text-warm">
                  {log.actorName || 'system'} · {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge tone="neutral" size="xs">{log.entity}</Badge>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

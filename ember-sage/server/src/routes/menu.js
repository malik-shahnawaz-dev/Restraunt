import { Router } from 'express'
import { Types } from '../db/orm.js'
import { MenuItem, Category } from '../models/index.js'
import { protect, adminOnly } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { upload } from '../middleware/upload.js'

const router = Router()

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/* ═════════ Public ═════════ */

router.get('/', async (req, res, next) => {
  try {
    const { category, search, sort, available } = req.query
    const q = {}
    if (category && category !== 'all') q.category = category
    if (search) {
      q.$or = [
        { name: new RegExp(String(search), 'i') },
        { description: new RegExp(String(search), 'i') },
        { tags: new RegExp(String(search), 'i') },
      ]
    }
    if (available === 'true') q.available = true

    let items = await MenuItem.find(q)

    const sorters = {
      popular: { reviewCount: -1 },
      rating: { rating: -1 },
      'price-asc': { price: 1 },
      'price-desc': { price: -1 },
      name: { name: 1 },
    }
    items.sort((a, b) => {
      const s = sorters[sort] || sorters.popular
      const key = Object.keys(s)[0]
      const dir = s[key]
      return (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir
    })
    res.json({ items })
  } catch (e) {
    next(e)
  }
})

router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1 })
    const counts = await MenuItem.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
    const map = new Map(counts.map((c) => [c._id, c.count]))
    res.json({
      categories: categories.map((c) => ({ ...c.toObject(), count: map.get(c.slug) || 0 })),
    })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new ApiError(404, 'Dish not found.')
    const item = await MenuItem.findById(req.params.id)
    if (!item) throw new ApiError(404, 'Dish not found.')
    res.json({ item })
  } catch (e) {
    next(e)
  }
})

/* ═════════ Admin CRUD ═════════ */

router.post('/', protect, adminOnly, upload.single('image'), async (req, res, next) => {
  try {
    const b = req.body
    if (!b.name || b.price == null) throw new ApiError(400, 'Name and price are required.')
    const tags = typeof b.tags === 'string' ? JSON.parse(b.tags) : b.tags || []
    const ingredients = typeof b.ingredients === 'string' ? b.ingredients.split(',').map((s) => s.trim()).filter(Boolean) : b.ingredients || []
    const item = await MenuItem.create({
      name: b.name,
      slug: slugify(b.name),
      category: b.category || 'starters',
      price: Number(b.price),
      description: b.description || '',
      longDescription: b.longDescription || b.description || '',
      image: req.file ? `/uploads/${req.file.filename}` : b.image || '/images/burger.jpg',
      ingredients,
      allergens: typeof b.allergens === 'string' ? JSON.parse(b.allergens) : b.allergens || [],
      tags,
      calories: Number(b.calories) || 400,
      prepTime: Number(b.prepTime) || 15,
      featured: b.featured === true || b.featured === 'true',
      available: b.available === undefined ? true : b.available === true || b.available === 'true',
      rating: Number(b.rating) || 4.7,
      reviewCount: Number(b.reviewCount) || 0,
    })
    res.status(201).json({ item })
  } catch (e) {
    next(e)
  }
})

router.put('/:id', protect, adminOnly, upload.single('image'), async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id)
    if (!item) throw new ApiError(404, 'Dish not found.')
    const b = req.body
    if (b.name) {
      item.name = b.name
      item.slug = slugify(b.name)
    }
    if (b.price != null && b.price !== '') item.price = Number(b.price)
    if (b.category) item.category = b.category
    if (b.description != null) item.description = b.description
    if (b.longDescription != null) item.longDescription = b.longDescription
    if (b.ingredients != null) {
      item.ingredients = typeof b.ingredients === 'string' ? b.ingredients.split(',').map((s) => s.trim()).filter(Boolean) : b.ingredients
    }
    if (b.allergens != null) item.allergens = typeof b.allergens === 'string' ? JSON.parse(b.allergens) : b.allergens
    if (b.tags != null) item.tags = typeof b.tags === 'string' ? JSON.parse(b.tags) : b.tags
    if (b.calories != null && b.calories !== '') item.calories = Number(b.calories)
    if (b.prepTime != null && b.prepTime !== '') item.prepTime = Number(b.prepTime)
    if (b.featured != null) item.featured = b.featured === true || b.featured === 'true'
    if (b.available != null) item.available = b.available === true || b.available === 'true'
    if (req.file) item.image = `/uploads/${req.file.filename}`
    else if (b.image) item.image = b.image
    await item.save()
    res.json({ item })
  } catch (e) {
    next(e)
  }
})

router.patch('/:id/availability', protect, adminOnly, async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id)
    if (!item) throw new ApiError(404, 'Dish not found.')
    item.available = req.body.available ?? !item.available
    await item.save()
    res.json({ item })
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    await MenuItem.deleteOne({ _id: req.params.id })
    res.json({ message: 'Dish deleted' })
  } catch (e) {
    next(e)
  }
})

/* ═════════ Category admin ═════════ */

router.post('/categories', protect, adminOnly, upload.single('image'), async (req, res, next) => {
  try {
    const { name, description } = req.body
    if (!name) throw new ApiError(400, 'Name is required.')
    const category = await Category.create({
      name,
      slug: slugify(name),
      description: description || '',
      image: req.file ? `/uploads/${req.file.filename}` : req.body.image || '',
      sortOrder: Number(req.body.sortOrder) || 0,
    })
    res.status(201).json({ category })
  } catch (e) {
    next(e)
  }
})

router.put('/categories/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) throw new ApiError(404, 'Category not found.')
    if (req.body.name) {
      category.name = req.body.name
      category.slug = slugify(req.body.name)
    }
    if (req.body.description != null) category.description = req.body.description
    if (req.body.image) category.image = req.body.image
    if (req.body.sortOrder != null) category.sortOrder = Number(req.body.sortOrder)
    await category.save()
    res.json({ category })
  } catch (e) {
    next(e)
  }
})

router.delete('/categories/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const cat = await Category.findById(req.params.id)
    if (!cat) throw new ApiError(404, 'Category not found.')
    const inUse = await MenuItem.countDocuments({ category: cat.slug })
    if (inUse > 0) throw new ApiError(400, `Cannot delete — ${inUse} dishes still use this category.`)
    await cat.deleteOne()
    res.json({ message: 'Category deleted' })
  } catch (e) {
    next(e)
  }
})

export default router

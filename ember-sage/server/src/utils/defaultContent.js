/**
 * defaultContent.js — factory defaults for every CMS-managed surface.
 *
 * These blocks are written to the database on first boot (and whenever an admin
 * hits “Restore defaults” in the CMS), so the storefront is 100% data-driven:
 * editing copy, images, gallery, FAQs or stats in the admin panel changes the
 * live site immediately, with no code deployment.
 */

export const DEFAULT_CONTENT = [
  /* ─────────────── Home — hero ─────────────── */
  {
    key: 'home.hero',
    group: 'home',
    sortOrder: 1,
    eyebrow: 'Open today · 11:00 AM – 11:00 PM',
    title: 'Good Food. Good Mood.',
    subtitle: 'Fresh ingredients, unforgettable flavors, and dishes crafted with passion.',
    image: '/images/hero.jpg',
    ctaLabel: 'Explore Menu',
    ctaHref: '/menu',
    data: {
      imageAlt: 'Signature dish plated at Ember & Sage',
      secondaryCtaLabel: 'Order Now',
      secondaryCtaHref: '/menu',
      stats: [
        { icon: 'clock', label: 'Open Today', value: '11:00 AM – 11:00 PM' },
        { icon: 'pin', label: 'Location', value: 'Islamabad' },
        { icon: 'star', label: 'Rating', value: '4.9 · 2,840 reviews' },
      ],
    },
  },

  /* ─────────────── Home — categories strip ─────────────── */
  {
    key: 'home.categories',
    group: 'home',
    sortOrder: 2,
    eyebrow: 'Browse by craving',
    title: 'What are you in the mood for?',
    subtitle: 'Eight kitchens’ worth of choice — tap a category to jump straight into the menu.',
    data: { titleEmphasis: 'in the mood for?', linkLabel: 'View full menu' },
  },

  /* ─────────────── Home — chef’s favorites ─────────────── */
  {
    key: 'home.featured',
    group: 'home',
    sortOrder: 3,
    eyebrow: 'Chef’s favorites',
    title: 'Loved by regulars, crafted by chefs',
    subtitle: 'The dishes our kitchen is proudest of — seasonal, signature, and consistently ordered twice.',
    data: { titleEmphasis: 'crafted by chefs', ctaLabel: 'Explore the full menu', limit: 6 },
  },

  /* ─────────────── Home — about preview ─────────────── */
  {
    key: 'home.about',
    group: 'home',
    sortOrder: 4,
    eyebrow: 'Our story',
    title: 'More than just a meal',
    subtitle: '',
    image: '/images/chef.jpg',
    ctaLabel: 'Read our full story',
    ctaHref: '/about',
    data: {
      titleEmphasis: 'meal',
      imageAlt: 'Chef plating a dish in the Ember & Sage kitchen',
      secondaryImage: '/images/interior.jpg',
      badgeValue: '15+',
      badgeLabel: 'Years crafting',
      paragraphs: [
        'Since 2011, Ember & Sage has been a quiet obsession for Islamabad’s diners — a place where open-flame cooking meets garden-fresh produce, and every plate tells a story of patience.',
        'Chef Amina Rahman and her team bake bread at dawn, mill their own spices, and source herbs from partner farms in the Margalla foothills. Nothing rushed, nothing ordinary.',
      ],
    },
  },

  /* ─────────────── Home — value band ─────────────── */
  {
    key: 'home.values',
    group: 'home',
    sortOrder: 5,
    title: 'Why guests keep coming back',
    data: {
      items: [
        { title: 'Farm-fresh daily', text: 'Produce from Margalla partner farms, delivered each morning.' },
        { title: '30-minute delivery', text: 'Insulated bags and live routing keep every dish restaurant-hot.' },
        { title: 'Open-flame kitchen', text: 'Charcoal, cast iron and wood — flavor you can hear sizzle.' },
      ],
    },
  },

  /* ─────────────── Home — gallery preview ─────────────── */
  {
    key: 'home.gallery',
    group: 'home',
    sortOrder: 6,
    eyebrow: 'The gallery',
    title: 'A glimpse inside the house',
    subtitle: 'Warm light, open flames, and rooms made for lingering.',
    data: { titleEmphasis: 'the house', ctaLabel: 'View full gallery' },
  },

  /* ─────────────── Home — reviews ─────────────── */
  {
    key: 'home.reviews',
    group: 'home',
    sortOrder: 7,
    eyebrow: 'Guest stories',
    title: 'Rated 4.9 by our guests',
    subtitle: 'Reviews from dine-in, pickup and delivery customers.',
    data: { titleEmphasis: '4.9' },
  },

  /* ─────────────── Home — reservation ─────────────── */
  {
    key: 'home.reservation',
    group: 'home',
    sortOrder: 8,
    eyebrow: 'Reservations',
    title: 'Save your table at the house',
    subtitle: 'Intimate dinners, celebrations, or a quiet corner for two — we’ll have it ready.',
    image: '/images/ambiance.jpg',
    data: { titleEmphasis: 'the house', formNote: 'We’ll confirm within 30 minutes during opening hours.' },
  },

  /* ─────────────── Home — contact ─────────────── */
  {
    key: 'home.contact',
    group: 'home',
    sortOrder: 9,
    eyebrow: 'Contact',
    title: 'Say hello',
    subtitle: 'Questions, private events, or feedback — we read every message.',
    data: { titleEmphasis: 'hello' },
  },

  /* ─────────────── About page ─────────────── */
  {
    key: 'about.page',
    group: 'about',
    sortOrder: 1,
    eyebrow: 'About us',
    title: 'More Than Just a Meal',
    subtitle: 'Fifteen years of open flames, quiet craft, and a dining room that feels like home — only better.',
    data: { ctaLabel: 'Order Now', ctaHref: '/menu' },
  },
  {
    key: 'about.chef',
    group: 'about',
    sortOrder: 2,
    eyebrow: 'The chef',
    title: 'Amina Rahman, Executive Chef',
    image: '/images/chef-portrait.jpg',
    data: {
      titleEmphasis: 'Executive Chef',
      imageAlt: 'Executive Chef Amina Rahman in the kitchen',
      paragraphs: [
        'Trained in Istanbul and London, Chef Amina returned to Islamabad with a simple obsession: food that tastes of place and time. She built Ember & Sage around a single wood-fired hearth and a menu that changes with the seasons.',
        '“We don’t chase trends,” she says. “We chase the perfect bite — the one that makes the table go quiet for a second.”',
      ],
      quote: 'We chase the perfect bite — the one that makes the table go quiet for a second.',
    },
  },
  {
    key: 'about.philosophy',
    group: 'about',
    sortOrder: 3,
    eyebrow: 'Our philosophy',
    title: 'Three rules we never break',
    data: {
      titleEmphasis: 'never break',
      items: [
        { title: 'Fire & Patience', text: 'Charcoal grills, cast-iron sears and slow braises. We let heat and time do the work no shortcut can.' },
        { title: 'Farm to Table', text: 'Herbs and greens arrive each morning from Margalla foothill farms; seafood lands three times a week.' },
        { title: 'Waste Less', text: 'Root-to-stem cooking, composting and measured prep mean flavor with a lighter footprint.' },
      ],
    },
  },

  /* ─────────────── Gallery page ─────────────── */
  {
    key: 'gallery.page',
    group: 'pages',
    sortOrder: 1,
    eyebrow: 'Gallery',
    title: 'Scenes from the House',
    subtitle: 'Food, rooms, hands at work — a look at everyday life inside Ember & Sage.',
  },

  /* ─────────────── Global site blocks ─────────────── */
  {
    key: 'site.stats',
    group: 'site',
    sortOrder: 1,
    title: 'By the numbers',
    data: {
      items: [
        { value: '15+', label: 'Years of Experience' },
        { value: '50+', label: 'Signature Dishes' },
        { value: '100K+', label: 'Happy Customers' },
        { value: '4.9', label: 'Average Rating' },
      ],
    },
  },
  {
    key: 'site.announcement',
    group: 'site',
    sortOrder: 2,
    title: 'Free delivery over $50',
    subtitle: 'Use code FREESHIP at checkout — limited time only.',
    active: false,
    data: { href: '/menu', tone: 'clay' },
  },
  {
    key: 'site.socials',
    group: 'site',
    sortOrder: 3,
    title: 'Follow the kitchen',
    data: {
      items: [
        { label: 'Instagram', href: 'https://instagram.com', icon: 'instagram' },
        { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' },
        { label: 'TikTok', href: 'https://tiktok.com', icon: 'tiktok' },
        { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' },
      ],
    },
  },
  {
    key: 'footer.newsletter',
    group: 'site',
    sortOrder: 4,
    eyebrow: 'Newsletter',
    title: 'Get delicious updates',
    subtitle: 'Seasonal menus, chef’s specials and members-only offers — no spam, just flavor.',
    data: { placeholder: 'Your email address', ctaLabel: 'Subscribe' },
  },
]

export const DEFAULT_GALLERY = [
  { title: 'Warm dining room with soft lighting', caption: 'Dinner service, just before the rush', image: '/images/interior.jpg', category: 'Interior', sortOrder: 1 },
  { title: 'Herb-crusted ribeye being plated', caption: 'The final spoon of rosemary jus', image: '/images/ribeye.jpg', category: 'Food', sortOrder: 2 },
  { title: 'Chef plating a signature dish', caption: 'Hands at work on the pass', image: '/images/chef.jpg', category: 'Chef', sortOrder: 3 },
  { title: 'Open kitchen during evening service', caption: 'Charcoal, cast iron and calm', image: '/images/kitchen.jpg', category: 'Kitchen', sortOrder: 4 },
  { title: 'Truffle mushroom pasta close-up', caption: 'Black truffle, aged parmesan', image: '/images/truffle-pasta.jpg', category: 'Food', sortOrder: 5 },
  { title: 'Guests enjoying candlelit dinner', caption: 'Candlelight in the main room', image: '/images/ambiance.jpg', category: 'Atmosphere', sortOrder: 6 },
  { title: 'Crafted cocktails at the bar', caption: 'Citrus cooler, smoked rose lemonade', image: '/images/bar-drinks.jpg', category: 'Drinks', sortOrder: 7 },
  { title: 'Classic tiramisu dessert', caption: 'Rested overnight for perfect harmony', image: '/images/tiramisu.jpg', category: 'Food', sortOrder: 8 },
  { title: 'Head chef in the kitchen', caption: 'Chef Amina Rahman', image: '/images/chef-portrait.jpg', category: 'Chef', sortOrder: 9 },
]

export const DEFAULT_FAQS = [
  {
    question: 'How long does delivery take?',
    answer: 'Most orders arrive in 30–40 minutes within Islamabad. You get a live status page with the kitchen’s progress as soon as you order.',
    category: 'Delivery',
    sortOrder: 1,
  },
  {
    question: 'Can I schedule an order for later?',
    answer: 'Yes — choose pickup or delivery at checkout and pick a time. The kitchen starts cooking so your food is ready exactly when you want it.',
    category: 'Orders',
    sortOrder: 2,
  },
  {
    question: 'Which payment methods do you accept?',
    answer: 'Card and online payments are processed instantly. Cash on delivery is available on most Islamabad addresses and can be switched on or off from restaurant settings.',
    category: 'Payments',
    sortOrder: 3,
  },
  {
    question: 'Do you handle allergies and dietary needs?',
    answer: 'Every dish lists its ingredients and allergens. Add a note at checkout and the kitchen will adapt the plate where the recipe allows.',
    category: 'Kitchen',
    sortOrder: 4,
  },
  {
    question: 'How do I change or cancel an order?',
    answer: 'Open the order in your account and hit Cancel while it is still Pending or Confirmed. Once the kitchen starts preparing, call the restaurant directly.',
    category: 'Orders',
    sortOrder: 5,
  },
  {
    question: 'Do you take large party reservations?',
    answer: 'Absolutely. Requests for 6+ guests are confirmed by phone, and we can arrange set menus for celebrations and corporate dinners.',
    category: 'Reservations',
    sortOrder: 6,
  },
]

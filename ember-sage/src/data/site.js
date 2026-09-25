export const REVIEWS = [
  {
    id: 1,
    name: 'Ayesha Khan',
    initials: 'AK',
    rating: 5,
    date: 'September 12, 2026',
    text: 'The truffle mushroom pasta is the best I’ve had in Islamabad — silky, aromatic, and generous with the truffle. The service made our anniversary feel genuinely special.',
    dish: 'Truffle Mushroom Pasta',
  },
  {
    id: 2,
    name: 'Daniel Reyes',
    initials: 'DR',
    rating: 5,
    date: 'September 4, 2026',
    text: 'Ordered delivery for the family — everything arrived hot, beautifully packed, and exactly as pictured. The ribeye is restaurant-quality at home. That never happens.',
    dish: 'Herb-Crusted Ribeye',
  },
  {
    id: 3,
    name: 'Sara Ahmed',
    initials: 'SA',
    rating: 5,
    date: 'August 28, 2026',
    text: 'Stunning interior, warm lighting, and a menu that actually delivers. The margherita crust is blistered perfectly. We’ll be back for the tasting menu next.',
    dish: 'Margherita di Bufala',
  },
  {
    id: 4,
    name: 'Omar Farooq',
    initials: 'OF',
    rating: 4,
    date: 'August 19, 2026',
    text: 'Ember Signature Burger lives up to the hype — that ember sauce is addictive. Only wish the pickup wait was a few minutes shorter on weekends.',
    dish: 'Ember Signature Burger',
  },
  {
    id: 5,
    name: 'Elena Petrova',
    initials: 'EP',
    rating: 5,
    date: 'August 10, 2026',
    text: 'Faultless from start to finish. The salmon’s skin was glass-crisp, the beurre blanc airy. Reservation was easy and the team remembered our preferences.',
    dish: 'Pan-Seared Salmon',
  },
]

export const GALLERY = [
  { id: 1, src: '/images/interior.jpg', alt: 'Warm dining room with soft lighting', tag: 'Interior', span: 'tall' },
  { id: 2, src: '/images/ribeye.jpg', alt: 'Herb-crusted ribeye being plated', tag: 'Food', span: 'wide' },
  { id: 3, src: '/images/chef.jpg', alt: 'Chef plating a signature dish', tag: 'Chef', span: 'normal' },
  { id: 4, src: '/images/kitchen.jpg', alt: 'Open kitchen during evening service', tag: 'Kitchen', span: 'normal' },
  { id: 5, src: '/images/truffle-pasta.jpg', alt: 'Truffle mushroom pasta close-up', tag: 'Food', span: 'wide' },
  { id: 6, src: '/images/ambiance.jpg', alt: 'Guests enjoying candlelit dinner', tag: 'Atmosphere', span: 'tall' },
  { id: 7, src: '/images/bar-drinks.jpg', alt: 'Crafted cocktails at the bar', tag: 'Drinks', span: 'normal' },
  { id: 8, src: '/images/tiramisu.jpg', alt: 'Classic tiramisu dessert', tag: 'Food', span: 'normal' },
  { id: 9, src: '/images/chef-portrait.jpg', alt: 'Head chef in the kitchen', tag: 'Chef', span: 'normal' },
]

export const PAST_ORDERS = [
  {
    id: '10248',
    date: 'Sep 18, 2026',
    items: ['Truffle Mushroom Pasta', 'Ember Signature Burger', 'Citrus Cooler ×2'],
    total: 48.5,
    status: 'Delivered',
    payment: 'Card',
  },
  {
    id: '10231',
    date: 'Sep 5, 2026',
    items: ['Herb-Crusted Ribeye', 'Classic Tiramisu'],
    total: 46.2,
    status: 'Delivered',
    payment: 'Cash',
  },
  {
    id: '10197',
    date: 'Aug 22, 2026',
    items: ['Saffron Seafood Risotto', 'Margherita di Bufala'],
    total: 45.1,
    status: 'Cancelled',
    payment: 'Refunded',
  },
  {
    id: '10256',
    date: 'Sep 23, 2026',
    items: ['Truffle Double Smash', 'Rose Lemonade'],
    total: 27.3,
    status: 'Preparing',
    payment: 'Card',
  },
]

export const SAVED_ADDRESSES = [
  {
    id: 1,
    label: 'Home',
    line: 'House 42, Street 18, Sector F-8/2',
    city: 'Islamabad',
    postal: '44000',
    isDefault: true,
    phone: '+92 300 1234567',
  },
  {
    id: 2,
    label: 'Work',
    line: 'Plot 7, Cyber Court, Blue Area',
    city: 'Islamabad',
    postal: '44000',
    isDefault: false,
    phone: '+92 300 7654321',
  },
]

export const FAVORITES = ['truffle-pasta', 'ribeye', 'ember-burger', 'tiramisu']

export const CUSTOMER_NOTIFS_SEED = [
  {
    id: 1,
    type: 'promo',
    title: 'Weekend special unlocked',
    message: 'Use WELCOME10 for 10% off your next order.',
    time: '2h ago',
    read: false,
  },
  {
    id: 2,
    type: 'order',
    title: 'Order #10256 is being prepared',
    message: 'The kitchen has started preparing your items.',
    time: 'Yesterday',
    read: false,
  },
  {
    id: 3,
    type: 'payment',
    title: 'Payment confirmed',
    message: '$48.50 received for order #10248.',
    time: 'Sep 18',
    read: true,
  },
]

/* ———————— Admin mock data ———————— */

export const ADMIN_RECENT_ORDERS = [
  { id: '10256', customer: 'Hira Malik', items: 3, amount: 27.3, payment: 'Paid', status: 'Preparing', date: 'Sep 23, 7:42 PM' },
  { id: '10255', customer: 'Zain Abbas', items: 5, amount: 71.5, payment: 'Paid', status: 'Out for Delivery', date: 'Sep 23, 7:15 PM' },
  { id: '10254', customer: 'Noor Hassan', items: 2, amount: 34.0, payment: 'COD', status: 'Confirmed', date: 'Sep 23, 6:58 PM' },
  { id: '10253', customer: 'Ali Raza', items: 4, amount: 56.8, payment: 'Paid', status: 'Delivered', date: 'Sep 23, 5:30 PM' },
  { id: '10252', customer: 'Mehwish Noor', items: 1, amount: 18.0, payment: 'Paid', status: 'Pending', date: 'Sep 23, 5:02 PM' },
  { id: '10251', customer: 'Usman Tariq', items: 6, amount: 92.4, payment: 'Paid', status: 'Ready', date: 'Sep 23, 4:41 PM' },
  { id: '10250', customer: 'Fatima Zahra', items: 2, amount: 29.9, payment: 'Failed', status: 'Cancelled', date: 'Sep 23, 4:12 PM' },
  { id: '10249', customer: 'Bilal Ahmed', items: 3, amount: 44.5, payment: 'Paid', status: 'Delivered', date: 'Sep 23, 3:20 PM' },
]

export const ADMIN_CUSTOMERS = [
  { id: 1, name: 'Hira Malik', email: 'hira.m@gmail.com', phone: '+92 300 1122334', orders: 24, spent: 1240.5, joined: 'Jan 12, 2025', status: 'Active' },
  { id: 2, name: 'Zain Abbas', email: 'zain.abbas@outlook.com', phone: '+92 321 5566778', orders: 18, spent: 987.2, joined: 'Mar 3, 2025', status: 'Active' },
  { id: 3, name: 'Noor Hassan', email: 'noor.hassan@gmail.com', phone: '+92 333 9988776', orders: 11, spent: 624.0, joined: 'Jun 21, 2025', status: 'Active' },
  { id: 4, name: 'Ali Raza', email: 'ali.raza@yahoo.com', phone: '+92 301 4455667', orders: 7, spent: 388.9, joined: 'Sep 8, 2025', status: 'Active' },
  { id: 5, name: 'Mehwish Noor', email: 'm.noor@gmail.com', phone: '+92 345 2233445', orders: 32, spent: 1876.4, joined: 'Nov 19, 2024', status: 'VIP' },
  { id: 6, name: 'Usman Tariq', email: 'usman.t@proton.me', phone: '+92 302 7788990', orders: 2, spent: 74.2, joined: 'Aug 2, 2026', status: 'New' },
  { id: 7, name: 'Fatima Zahra', email: 'fatima.z@gmail.com', phone: '+92 311 6655443', orders: 0, spent: 0, joined: 'Sep 20, 2026', status: 'Inactive' },
  { id: 8, name: 'Bilal Ahmed', email: 'bilal.a@hotmail.com', phone: '+92 336 1234987', orders: 15, spent: 842.6, joined: 'Feb 14, 2025', status: 'Active' },
]

export const REVENUE_SERIES = [
  { label: 'Mon', revenue: 1840, orders: 42 },
  { label: 'Tue', revenue: 2120, orders: 48 },
  { label: 'Wed', revenue: 1960, orders: 45 },
  { label: 'Thu', revenue: 2480, orders: 57 },
  { label: 'Fri', revenue: 3620, orders: 84 },
  { label: 'Sat', revenue: 4180, orders: 96 },
  { label: 'Sun', revenue: 3450, orders: 79 },
]

export const POPULAR_DISHES = [
  { name: 'Ember Signature Burger', orders: 312, pct: 100 },
  { name: 'Truffle Mushroom Pasta', orders: 287, pct: 92 },
  { name: 'Herb-Crusted Ribeye', orders: 241, pct: 77 },
  { name: 'Margherita di Bufala', orders: 198, pct: 63 },
  { name: 'Classic Tiramisu', orders: 176, pct: 56 },
]

export const ORDERS_BY_CATEGORY = [
  { name: 'Burgers', value: 28, color: '#C0522F' },
  { name: 'Pizza', value: 22, color: '#5F6F45' },
  { name: 'Pasta', value: 18, color: '#17140F' },
  { name: 'Mains', value: 16, color: '#B07D2A' },
  { name: 'Desserts', value: 9, color: '#8C8375' },
  { name: 'Others', value: 7, color: '#E7DCC9' },
]

export const TRACK_STAGES = [
  { id: 'placed', label: 'Order Placed', done: true },
  { id: 'confirmed', label: 'Order Confirmed', done: true },
  { id: 'preparing', label: 'Preparing', done: false, active: true },
  { id: 'delivery', label: 'Out for Delivery', done: false },
  { id: 'delivered', label: 'Delivered', done: false },
]

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
]

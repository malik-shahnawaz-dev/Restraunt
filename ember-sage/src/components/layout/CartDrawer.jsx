import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, Trash2, X } from 'lucide-react'
import { Drawer } from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { QuantityStepper, EmptyState } from '../ui/Motion.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

export function CartLine({ line, compact = false }) {
  const { setQty, removeItem, lineUnitPrice } = useCart()
  const unit = lineUnitPrice(line)

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-3.5 rounded-2xl border border-ink/6 bg-white p-3.5 shadow-soft"
    >
      <Link to={`/menu/${line.id}`} className="shrink-0" onClick={() => {}}>
        <img
          src={line.image || '/images/kitchen.jpg'}
          alt=""
          className={`rounded-xl object-cover ${compact ? 'h-16 w-16' : 'h-20 w-20'}`}
          loading="lazy"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-semibold text-ink">{line.name}</p>
            {(line.size !== 'regular' || line.addons?.length > 0 || line.notes) && (
              <p className="mt-0.5 truncate text-[12.5px] text-warm">
                {[line.size === 'large' ? 'Large' : null, ...line.addons?.map((a) => a.label), line.notes || null]
                  .filter(Boolean)
                  .join(' + ')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeItem(line.key)}
            aria-label={`Remove ${line.name} from cart`}
            className="rounded-full p-1.5 text-warm transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 size={15} />
          </button>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <QuantityStepper value={line.qty} onChange={(q) => setQty(line.key, q)} min={0} size="sm" ariaLabel={`Quantity of ${line.name}`} />
          <span className="text-[15px] font-semibold text-ink tabular-nums">
            ${(unit * line.qty).toFixed(2)}
          </span>
        </div>
      </div>
    </motion.li>
  )
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, totals } = useCart()
  const navigate = useNavigate()
  const toast = useToast()

  const goCheckout = () => {
    closeCart()
    navigate('/checkout')
  }

  return (
    <Drawer open={isOpen} onClose={closeCart} label="Shopping cart" width="max-w-[430px]">
      <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-display text-xl font-medium">Your Cart</h2>
          <p className="text-[13px] text-warm">
            {totals.count === 0 ? 'No items yet' : `${totals.count} item${totals.count > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={closeCart}
          aria-label="Close cart"
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-ink transition hover:bg-beige hover:rotate-90"
        >
          <X size={19} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            message="Hungry for something special? Explore the menu and add a dish or two."
            action={
              <Button
                onClick={() => {
                  closeCart()
                  navigate('/menu')
                }}
              >
                Explore Menu
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
            <AnimatePresence initial={false}>
              {items.map((line) => (
                <CartLine key={line.key} line={line} compact />
              ))}
            </AnimatePresence>
          </ul>

          <div className="border-t border-ink/8 bg-beige/60 px-5 py-5 sm:px-6">
            <div className="mb-4 space-y-1.5 text-[14px]">
              <div className="flex justify-between text-warm">
                <span>Subtotal</span>
                <span className="font-medium text-ink tabular-nums">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-warm">
                <span>Delivery</span>
                <span className="font-medium text-ink tabular-nums">
                  {totals.deliveryFee === 0 ? 'Free' : `$${totals.deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 text-[16px] font-semibold text-ink">
                <span>Estimated total</span>
                <span className="tabular-nums">${(totals.subtotal + totals.tax + totals.deliveryFee - totals.discount).toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                onClick={() => {
                  closeCart()
                  navigate('/cart')
                }}
              >
                View Cart
              </Button>
              <Button
                onClick={() => {
                  closeCart()
                  toast.info('Redirecting to checkout…')
                  setTimeout(goCheckout, 200)
                }}
              >
                Checkout
              </Button>
            </div>
          </div>
        </>
      )}
    </Drawer>
  )
}

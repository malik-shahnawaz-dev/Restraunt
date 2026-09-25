import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from './AuthContext.jsx'

const NotificationsContext = createContext(null)

function relativeTime(value) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Normalises an API notification into the shape the bell UI renders. */
function normalise(notification) {
  return {
    ...notification,
    id: notification._id || notification.id,
    time: notification.time || relativeTime(notification.createdAt),
  }
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const [serverList, setServerList] = useState([])
  const [localList, setLocalList] = useState([])

  // Admins read the admin endpoint, customers their own — both are scoped to the session user.
  const basePath = user?.role === 'admin' ? '/admin/notifications' : '/users/me/notifications'

  const load = useCallback(async () => {
    if (!user) {
      setServerList([])
      return
    }
    try {
      const d = await api.get(basePath)
      setServerList((d.notifications || []).map(normalise))
    } catch {
      setServerList([])
    }
  }, [user, basePath])

  useEffect(() => {
    load()
  }, [load])

  // Keep the badge fresh while the user is on the site (order status changes, promos…)
  useEffect(() => {
    if (!user) return undefined
    const timer = setInterval(load, 45000)
    return () => clearInterval(timer)
  }, [user, load])

  const notifications = useMemo(() => [...localList, ...serverList].slice(0, 30), [localList, serverList])

  const notify = useCallback((notif) => {
    setLocalList((prev) => [{ id: `l_${Date.now()}`, time: 'Just now', read: false, ...notif }, ...prev])
  }, [])

  const markRead = useCallback(
    async (id) => {
      if (String(id).startsWith('l_')) {
        setLocalList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
        return
      }
      setServerList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      try {
        await api.patch(`${basePath}/${id}/read`)
      } catch {
        /* optimistic is fine */
      }
    },
    [basePath],
  )

  const markAllRead = useCallback(async () => {
    setServerList((prev) => prev.map((n) => ({ ...n, read: true })))
    setLocalList((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.patch(`${basePath}/read-all`)
    } catch {
      /* ignore */
    }
  }, [basePath])

  const clearAll = useCallback(async () => {
    setLocalList([])
    setServerList([])
    try {
      if (user?.role !== 'admin') await api.del('/users/me/notifications')
    } catch {
      /* ignore */
    }
  }, [user])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const value = useMemo(
    () => ({ notifications, unreadCount, notify, markRead, markAllRead, clearAll, refresh: load }),
    [notifications, unreadCount, notify, markRead, markAllRead, clearAll, load],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}

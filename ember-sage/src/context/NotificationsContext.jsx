import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from './AuthContext.jsx'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const [serverList, setServerList] = useState([])
  const [localList, setLocalList] = useState([])

  const load = useCallback(async () => {
    if (!user) {
      setServerList([])
      return
    }
    try {
      const d = await api.get('/admin/notifications')
      setServerList(d.notifications)
    } catch {
      setServerList([])
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const notifications = useMemo(
    () => [...localList, ...serverList].slice(0, 30),
    [localList, serverList],
  )

  const notify = useCallback((notif) => {
    setLocalList((prev) => [{ id: `l_${Date.now()}`, time: 'Just now', read: false, ...notif }, ...prev])
  }, [])

  const markRead = useCallback(async (id) => {
    if (String(id).startsWith('l_')) {
      setLocalList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      return
    }
    setServerList((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
    try {
      await api.patch(`/admin/notifications/${id}/read`)
    } catch {
      /* optimistic is fine */
    }
  }, [])

  const markAllRead = useCallback(async () => {
    setServerList((prev) => prev.map((n) => ({ ...n, read: true })))
    setLocalList((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.patch('/admin/notifications/read-all')
    } catch {
      /* ignore */
    }
  }, [])

  const clearAll = useCallback(() => {
    setLocalList([])
    setServerList([])
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

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

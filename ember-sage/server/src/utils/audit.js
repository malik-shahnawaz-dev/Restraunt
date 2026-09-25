import { AuditLog } from '../models/index.js'

/** Records an admin action in the audit trail (never throws — logging is best-effort). */
export async function logAudit(req, action, entity, summary, entityId = null) {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      actorName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'system',
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      summary,
    })
  } catch (error) {
    console.error('[audit] failed to write log:', error.message)
  }
}

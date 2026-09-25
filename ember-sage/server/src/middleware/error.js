export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500)
  const message =
    err.name === 'ValidationError'
      ? Object.values(err.errors || {}).map((e) => e.message).join(', ') || err.message
      : err.code === 11000
        ? 'A record with that value already exists.'
        : err.message || 'Server error'
  if (status >= 500) console.error('[error]', err)
  res.status(status).json({ message })
}

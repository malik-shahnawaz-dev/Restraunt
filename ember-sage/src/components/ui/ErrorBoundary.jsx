import { Component } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import Button from './Button.jsx'

/**
 * Last line of defence: a crash anywhere in the tree is caught here instead of
 * leaving the guest staring at a blank page. The error is logged, shown in a
 * readable panel in development, and always offers a way back.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // eslint-disable-next-line no-console
    console.error('[ui] unrecoverable render error:', error, info?.componentStack)
  }

  reset = () => this.setState({ error: null, info: null })

  render() {
    const { error, info } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-5 py-20">
        <div className="rounded-panel border border-ink/6 bg-white p-8 shadow-soft sm:p-10">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle size={22} />
          </span>
          <h1 className="mt-5 font-display text-[26px] font-medium">Something went wrong</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-warm">
            The page hit an unexpected error. Nothing was lost — your cart and account are safe on the server.
          </p>
          {import.meta.env.DEV && error?.message && (
            <pre className="mt-5 max-h-52 overflow-auto rounded-xl bg-beige p-4 text-[12.5px] leading-relaxed text-ink-600">
              {error.message}
              {info?.componentStack ? `\n${info.componentStack.split('\n').slice(0, 6).join('\n')}` : ''}
            </pre>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={this.reset}>
              <RotateCcw size={15} /> Try again
            </Button>
            <Link to="/">
              <Button variant="outline">Back home</Button>
            </Link>
            <a href="mailto:hello@emberandsage.pk" className="text-[13.5px] font-medium text-clay hover:underline">
              Report this problem →
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary

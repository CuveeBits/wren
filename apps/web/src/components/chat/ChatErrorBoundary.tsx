'use client'

/**
 * C-13 (sprint brief): ChatErrorBoundary — chat-specific error handling.
 *
 * Class-based React error boundary wrapping the chat UI.
 * Shows a friendly error message and a retry button that resets the boundary.
 */
import * as React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@wren/ui'

interface ChatErrorBoundaryProps {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ChatErrorBoundary extends React.Component<ChatErrorBoundaryProps, State> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message:
        error instanceof Error ? error.message : 'An unexpected error occurred in the chat.',
    }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // In production, forward to an error monitoring service (e.g. Sentry)
    console.error('[ChatErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 mb-5">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {this.state.message || 'The chat encountered an unexpected error. Please try again.'}
          </p>
          <Button variant="outline" onClick={this.handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="m-4 rounded-2xl border border-red-500/20 bg-red-50 p-4 text-red-950 dark:bg-red-950/30 dark:text-red-100">
          <div className="flex items-start gap-3">
            <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">Something went wrong</h2>
              <p className="mt-1 text-sm text-red-900/80 dark:text-red-100/75">
                An unexpected error occurred. Please try again.
              </p>
              {this.state.error && (
                <pre className="mt-3 max-h-28 overflow-auto rounded-lg bg-red-950/10 p-2 text-xs">
                  {this.state.error.message}
                </pre>
              )}
              <button
                type="button"
                onClick={this.handleReset}
                className="mt-3 h-9 rounded-full bg-red-600 px-3 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

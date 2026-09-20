import { Component, type ReactNode, type ErrorInfo } from 'react';
import { WarningIcon } from '@phosphor-icons/react';
import { Button } from '@cloudflare/kumo/components/button';

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
        <div className="m-4 flex min-h-64 items-center justify-center rounded-lg border border-slate-950/10 bg-white/82 p-6 text-slate-950 shadow-sm backdrop-blur-xl dark:border-border dark:bg-popover dark:text-white">
          <div className="flex max-w-md items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/18 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-200">
              <WarningIcon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">This view could not be displayed</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Refresh the page to try again. If the map is affected, check that hardware
                acceleration is enabled in your browser.
              </p>
              <Button
                type="button"
                onClick={() => window.location.reload()}
                variant="primary"
                size="lg"
                className="mt-4"
              >
                Refresh page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

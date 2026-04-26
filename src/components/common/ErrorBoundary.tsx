import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Alert, Button, Stack, Text, Code } from '@mantine/core';
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
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert
          icon={<IconAlertTriangle size={20} />}
          title="Something went wrong"
          color="red"
          variant="light"
          radius="md"
          m="md"
        >
          <Stack gap="sm">
            <Text size="sm">An unexpected error occurred. Please try again.</Text>
            {this.state.error && (
              <Code block style={{ fontSize: '0.75rem', maxHeight: 120, overflow: 'auto' }}>
                {this.state.error.message}
              </Code>
            )}
            <Button
              size="sm"
              variant="light"
              color="red"
              onClick={this.handleReset}
              style={{ alignSelf: 'flex-start' }}
            >
              Try again
            </Button>
          </Stack>
        </Alert>
      );
    }

    return this.props.children;
  }
}

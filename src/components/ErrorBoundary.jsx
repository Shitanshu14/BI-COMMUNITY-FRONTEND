import { Component } from "react";

// Wraps each routed page. Before this existed, one unexpected/missing field
// in an API response (e.g. a null nested object) would throw during render
// and React would unmount the whole tree — the user saw a blank white page
// with zero indication anything went wrong. Now that failure is contained
// to the page that broke, with a message and a one-click retry.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Clear the crash when the user navigates away (route key changes),
    // so going back to a working page doesn't stay stuck on the error card.
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="empty-state error-boundary">
          <div className="error-boundary-icon">⚠️</div>
          <div className="error-boundary-title">Something went wrong loading this page.</div>
          <div className="error-boundary-sub">
            {this.state.error?.message || "Unexpected error."}
          </div>
          <button className="btn btn-secondary" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

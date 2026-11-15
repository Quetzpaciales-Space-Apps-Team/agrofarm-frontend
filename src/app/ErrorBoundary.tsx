import { Component, type ErrorInfo, type ReactNode } from 'react';
import { withTranslation, type WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
}

class Boundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    const { t } = this.props;
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="state state--error">
        <h2>{t('app.errorBoundary.title')}</h2>
        <p>{t('app.errorBoundary.body')}</p>
        <button type="button" className="button" onClick={() => window.location.reload()}>
          {t('app.errorBoundary.reload')}
        </button>
      </div>
    );
  }
}

export const ErrorBoundary = withTranslation()(Boundary);

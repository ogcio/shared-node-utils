# Next.js Analytics

The `@ogcio/nextjs-analytics` package provides a set of utilities and components to integrate analytics tracking into Next.js applications. It leverages the `@ogcio/analytics-sdk` to track events, page views, and manage analytics configurations.

## Features

- **AnalyticsProvider**: A React context provider to initialize and manage the analytics instance.
- **useAnalytics Hook**: A custom hook to interact with the analytics instance for tracking events and page views.
- **TypeScript Support**: Fully typed for better developer experience.

## Installation

Install the package using npm or yarn:

```bash
npm install @ogcio/nextjs-analytics
# or
yarn add @ogcio/nextjs-analytics
```

## Usage

### AnalyticsProvider

Wrap your application with the `AnalyticsProvider` to initialize the analytics instance:

```tsx
import { AnalyticsProvider } from "@ogcio/nextjs-analytics";

const analyticsConfig = {
  baseUrl: "https://analytics.example.com",
  trackingWebsiteId: "your-website-id",
  organizationId: "your-organization-id",
  dryRun: false, // Set to true for testing without sending data
};

function MyApp({ children }: { children: React.ReactNode }) {
  return (
    <AnalyticsProvider config={analyticsConfig}>
      {children}
    </AnalyticsProvider>
  );
}

export default MyApp;
```

### useAnalytics Hook

Use the `useAnalytics` hook to track events and page views:

```tsx
import { useAnalytics } from "@ogcio/nextjs-analytics";

function MyComponent() {
  const analyticsClient = useAnalytics();

  const handleClick = () => {
    analyticsClient.trackEvent({
      event: {
        category: "button",
        action: "click",
        name: "my-button",
      },
    });
  };

  useEffect(() => {
    analyticsClient.pageView({
      event: {
        title: "My Page",
      },
    });
  }, []);

  return <button onClick={handleClick}>Click Me</button>;
}
```

## Testing

This package includes unit tests for all utilities and components. To run the tests, use:

```bash
npm test
```

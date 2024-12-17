interface AnalyticsConfigProps {
  baseUrl: string;
  trackingWebsiteId?: string;
  organizationId: string;
  dryRun: boolean;
  applicationId: string;
  applicationSecret: string;
  logtoOidcEndpoint: string;
}

interface AnalyticsTrackerProps {
  /**
   * The user ID to track.
   * Ensure that the user ID is unique to the user.
   * Tracking the UserID should be done in compliance with the GDPR.
   * @default undefined
   */
  userId?: string;
  customDimensions?: {
    [x: `dimension${number}`]: string;
  };
}

export type { AnalyticsConfigProps, AnalyticsTrackerProps };

export type NotificationPolicyReference = {
  receiver: string;
  route: {
    type: 'auto-generated' | 'normal';
  };
};

export interface ContactPointWithMetadata extends GrafanaManagedContactPoint {
  id: string;
  name: string;
}

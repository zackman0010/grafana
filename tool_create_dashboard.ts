import { z } from 'zod';
import { GrafanaClient } from './grafana-client';

const dashboardSchema = z.object({
  title: z.string(),
  uid: z.string().optional(),
  folderUid: z.string().optional(),
  data: z.any(),
});

export type CreateDashboardInput = z.infer<typeof dashboardSchema>;

export async function create_dashboard(
  client: GrafanaClient,
  input: CreateDashboardInput
): Promise<{ uid: string; url: string }> {
  // Validate input
  const validatedInput = dashboardSchema.parse(input);

  // Create dashboard data
  const dashboardData = {
    dashboard: {
      ...validatedInput.data,
      title: validatedInput.title,
      uid: validatedInput.uid,
      folderUid: validatedInput.folderUid,
    },
    overwrite: false,
  };

  // Create dashboard
  const response = await client.post('/api/dashboards/db', dashboardData);

  if (!response.ok) {
    throw new Error(`Failed to create dashboard: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.uid || !result.url) {
    throw new Error('Invalid response from Grafana API');
  }

  return {
    uid: result.uid,
    url: result.url,
  };
}

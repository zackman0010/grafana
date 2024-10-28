import { test, expect, PanelEditPage } from '@grafana/plugin-e2e';
import { Locator } from '@playwright/test';

function getSection(label: string, panelEditPage: PanelEditPage, section: string = 'Test'): Locator {
  return panelEditPage.getByGrafanaSelector(`${section} ${label} field property editor`);
}

test.describe('panel options', () => {
  test.beforeEach(async ({ panelEditPage }) => {
    await panelEditPage.setVisualization('Test');
    await panelEditPage.collapseSection('Test');
  });

  test('boolean switch', async ({ panelEditPage, page, selectors }) => {
    const section = getSection('Show series counter', panelEditPage);
    await expect(section.getByRole('switch', { name: 'Show series counter' })).not.toBeChecked();
    section.getByRole('switch').check({ force: true });
    await expect(section.getByRole('switch')).toBeChecked();
  });

  test('addTextInput', async ({ panelEditPage, page, selectors }) => {
    const section = getSection('Simple text option', panelEditPage);
    const field = section.getByRole('textbox', { name: 'Simple text option' });
    await expect(field).toBeEmpty();
    field.fill('test test');
    await expect(field).toHaveValue('test test');
  });
});

-----

aliases:

- ../../../alerting-rules/manage-contact-points/integrations/pager-duty/ \# /docs/grafana/\<GRAFANA\_VERSION\>/alerting/alerting-rules/manage-contact-points/integrations/pager-duty/
  canonical: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/pager-duty/
  description: Configure the PagerDuty integration for Alerting
  keywords:
- grafana
- alerting
- pagerduty
  labels:
  products:
  - cloud
  - enterprise
  - oss
    menuTitle: PagerDuty
    title: Configure PagerDuty for Alerting
    weight: 150

-----

# Configure PagerDuty for Alerting

Use the Grafana Alerting - PagerDuty integration to receive notifications in PagerDuty when your alerts are firing.

## Before you begin

To set up PagerDuty for integration with Grafana Alerting, you need to create a [PagerDuty](https://www.pagerduty.com/) account. There are several set up steps to perform within PagerDuty before you set up the integration in Grafana Alerting.

### Create a Service

In PagerDuty, a service represents a component, microservice, or infrastructure element that a team oversees, manages, and monitors.

1. Refer to [PagerDuty’s services and integrations guide](https://support.pagerduty.com/docs/services-and-integrations#create-a-service).

2. Follow steps 1 to 5 under **Create a Service**.

{{\< admonition type="note" \>}}
In step 5, choose **Create a service without an integration**.
{{\< /admonition \>}}

### Obtain a PagerDuty integration key

1. Once the service is created, click **Integrations** within the Service options.
2. Click **+ Add an integration**.
3. Select **Events API V2**.
4. Click **Add**.
5. Click the drop-down arrow to display the integration details.
6. Copy the **Integration Key**.

## Procedure

To create your PagerDuty integration in Grafana Alerting, complete the following steps.

1. Navigate to **Alerts & IRM** -\> **Alerting** -\> **Contact points**.

2. Click **+ Add contact point**.

3. Enter a contact point name.

4. From the Integration list, select **PagerDuty**.

5. In the **Integration Key** field, copy in your integration key.

6. Click **Test** to check that your integration works.
   
   \*\* For Grafana Alertmanager only.\*\*
   
   An incident should display in the Service’s Activity tab in PagerDuty.

7. Click **Save contact point**.

## Next steps

The PagerDuty contact point is ready to receive alert notifications.

To add this contact point to your alert, complete the following steps.

1. In Grafana, navigate to **Alerting** \> **Alert rules**.
2. Edit or create a new alert rule.
3. Scroll down to the **Configure labels and notifications** section.
4. Under Notifications click **Select contact point**.
5. From the drop-down menu, select the previously created contact point.
6. **Click Save rule and exit**.

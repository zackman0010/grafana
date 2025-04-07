-----

canonical: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-email/
description: Configure email integration to send email notifications when your alerts are firing
keywords:

- grafana
- alerting
- email
- integration
  labels:
  products:
  - cloud
  - enterprise
  - oss
    menuTitle: Email
    title: Configure email for Alerting
    weight: 110
    refs:
    notification-templates:
  - pattern: /docs/grafana/
    destination: /docs/grafana/\<GRAFANA\_VERSION\>/alerting/configure-notifications/template-notifications/
  - pattern: /docs/grafana-cloud/
    destination: /docs/grafana-cloud/alerting-and-irm/alerting/configure-notifications/template-notifications/

-----

# Configure email for Alerting

Use the Grafana Alerting - email integration to send email notifications when your alerts are firing. An email is sent when an alert fires and when an alert gets resolved.

Note that you can customize the `subject` and `message` of the email using [notification templates](ref:notification-templates). However, you cannot add HTML and CSS to email notifications for visual changes.

## Before you begin

{{<admonition type="note">}}
This section is for Grafana OSS only. For Grafana Cloud, SMTP configuration is not required.
{{</admonition>}}

For Grafana OSS, you enable email notifications by first configuring [SMTP settings](https://grafana.com/docs/grafana/next/setup-grafana/configure-grafana/#smtp) in the Grafana configuration settings.

### SMTP configuration

1. Access the configuration file.
   
   Locate the Grafana configuration file. This file is typically named `grafana.ini` or `custom.ini` and is located in the `conf` directory within the Grafana installation directory.

2. Open the configuration file:
   
   Open the configuration file using a text editor.

3. Locate SMTP settings section.
   
   Search for the [SMTP settings section](https://grafana.com/docs/grafana/next/setup-grafana/configure-grafana/#smtp) in the configuration file. It starts with `[smtp]`.

4. Configure SMTP settings.
   
   Within the `[smtp]` settings section, specify the following parameters:
   
   - `enabled = true`: Enables SMTP.
   - `host`: The hostname or IP address of your SMTP server, and the port number of your SMTP server (commonly 25, 465, or 587). Default is `localhost:25`.
   - `user`: Your SMTP username (if authentication is required).
   - `password`: Your SMTP password (if authentication is required).
   - `from_address`: The email address from which Grafana notifications will be sent.
   - `from_name`: The name associated with the from\_address.
   - `skip_verify = true`: Skip SSL/TLS certificate verification (useful for testing, but not recommended for production).

5. Save and close the configuration file.
   
   After configuring the SMTP settings, save the changes to the configuration file and close the text editor.

6. Restart Grafana.
   
   Restart the Grafana service to apply the changes made to the configuration file. The method for restarting Grafana depends on your operating system and how Grafana was installed (e.g., `systemctl restart grafana-server` for systems using systemd).

7. Test email notifications.
   
   After restarting Grafana, test the email notification functionality by creating an email contact point.

## Procedure

To set up email integration, complete the following steps.

1. Navigate to **Alerts & IRM** -\> **Alerting** -\> **Contact points**.

2. Click **+ Add contact point**.

3. Enter a contact point name.

4. From the Integration list, select **Email**.

5. Enter the email addresses you want to send notifications to.
   
   E-mail addresses are case sensitive. Ensure that the e-mail address entered is correct.

6. Click **Test** to check that your integration works.
   
   \*\* For Grafana Alertmanager only.\*\*

7. Click **Save contact point**.

## Next steps

The email contact point is ready to receive alert notifications.

To add this contact point to your alert, complete the following steps.

1. In Grafana, navigate to **Alerting** \> **Alert rules**.
2. Edit or create a new alert rule.
3. Scroll down to the **Configure labels and notifications** section.
4. Under Notifications click **Select contact point**.
5. From the drop-down menu, select the previously created contact point.
6. **Click Save rule and exit**.

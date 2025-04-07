-----

aliases:

- ../../installation/debian/
- ../../installation/installation/debian/
  description: Install guide for Grafana on Debian or Ubuntu
  labels:
  products:
  - enterprise
  - oss
    menuTitle: Debian or Ubuntu
    title: Install Grafana on Debian or Ubuntu
    weight: 100

-----

# Install Grafana on Debian or Ubuntu

This topic explains how to install Grafana dependencies, install Grafana on Linux Debian or Ubuntu, and start the Grafana server on your Debian or Ubuntu system.

There are multiple ways to install Grafana: using the Grafana Labs APT repository, by downloading a `.deb` package, or by downloading a binary `.tar.gz` file. Choose only one of the methods below that best suits your needs.

{{\< admonition type="note" \>}}
If you install via the `.deb` package or `.tar.gz` file, then you must manually update Grafana for each new version.
{{\< /admonition \>}}

The following video demonstrates how to install Grafana on Debian and Ubuntu as outlined in this document:

{{\< youtube id="\_Zk\_XQSjF\_Q" \>}}

## Install from APT repository

If you install from the APT repository, Grafana automatically updates when you run `apt-get update`.

| Grafana Version           | Package            | Repository                            |
| ------------------------- | ------------------ | ------------------------------------- |
| Grafana Enterprise        | grafana-enterprise | `https://apt.grafana.com stable main` |
| Grafana Enterprise (Beta) | grafana-enterprise | `https://apt.grafana.com beta main`   |
| Grafana OSS               | grafana            | `https://apt.grafana.com stable main` |
| Grafana OSS (Beta)        | grafana            | `https://apt.grafana.com beta main`   |

{{\< admonition type="note" \>}}
Grafana Enterprise is the recommended and default edition. It is available for free and includes all the features of the OSS edition. You can also upgrade to the [full Enterprise feature set](/products/enterprise/?utm_source=grafana-install-page), which has support for [Enterprise plugins](/grafana/plugins/?enterprise=1&utcm_source=grafana-install-page).
{{\< /admonition \>}}

Complete the following steps to install Grafana from the APT repository:

1. Install the prerequisite packages:
   
   ``` bash
   sudo apt-get install -y apt-transport-https software-properties-common wget
   ```

2. Import the GPG key:
   
   ``` bash
   sudo mkdir -p /etc/apt/keyrings/
   wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
   ```

3. To add a repository for stable releases, run the following command:
   
   ``` bash
   echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
   ```

4. To add a repository for beta releases, run the following command:
   
   ``` bash
   echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com beta main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
   ```

5. Run the following command to update the list of available packages:
   
   ``` bash
   # Updates the list of available packages
   sudo apt-get update
   ```

6. To install Grafana OSS, run the following command:
   
   ``` bash
   # Installs the latest OSS release:
   sudo apt-get install grafana
   ```

7. To install Grafana Enterprise, run the following command:
   
   ``` bash
   # Installs the latest Enterprise release:
   sudo apt-get install grafana-enterprise
   ```

## Install Grafana using a deb package

If you install Grafana manually using the deb package, then you must manually update Grafana for each new version.

Complete the following steps to install Grafana using a deb package:

1. Navigate to the [Grafana download page](/grafana/download).
2. Select the Grafana version you want to install.
   - The most recent Grafana version is selected by default.
   - The **Version** field displays only tagged releases. If you want to install a nightly build, click **Nightly Builds** and then select a version.
3. Select an **Edition**.
   - **Enterprise:** This is the recommended version. It is functionally identical to the open source version, but includes features you can unlock with a license, if you so choose.
   - **Open Source:** This version is functionally identical to the Enterprise version, but you will need to download the Enterprise version if you want Enterprise features.
4. Depending on which system you are running, click the **Linux** or **ARM** tab on the [download page](/grafana/download).
5. Copy and paste the code from the [download page](/grafana/download) into your command line and run.

## Install Grafana as a standalone binary

Complete the following steps to install Grafana using the standalone binaries:

1. Navigate to the [Grafana download page](/grafana/download).

2. Select the Grafana version you want to install.
   
   - The most recent Grafana version is selected by default.
   - The **Version** field displays only tagged releases. If you want to install a nightly build, click **Nightly Builds** and then select a version.

3. Select an **Edition**.
   
   - **Enterprise:** This is the recommended version. It is functionally identical to the open source version but includes features you can unlock with a license if you so choose.
   - **Open Source:** This version is functionally identical to the Enterprise version, but you will need to download the Enterprise version if you want Enterprise features.

4. Depending on which system you are running, click the **Linux** or **ARM** tab on the [download page](/grafana/download).

5. Copy and paste the code from the [download page](/grafana/download) page into your command line and run.

6. Create a user account for Grafana on your system:
   
   ``` shell
   sudo useradd -r -s /bin/false grafana
   ```

7. Move the unpacked binary to `/usr/local/grafana`:
   
   ``` shell
   sudo mv <DOWNLOAD PATH> /usr/local/grafana
   ```

8. Change the owner of `/usr/local/grafana` to Grafana users:
   
   ``` shell
   sudo chown -R grafana:users /usr/local/grafana
   ```

9. Create a Grafana server systemd unit file:
   
   ``` shell
   sudo touch /etc/systemd/system/grafana-server.service
   ```

10. Add the following to the unit file in a text editor of your choice:
    
    ``` ini
    [Unit]
    Description=Grafana Server
    After=network.target
    
    [Service]
    Type=simple
    User=grafana
    Group=users
    ExecStart=/usr/local/grafana/bin/grafana server --config=/usr/local/grafana/conf/grafana.ini --homepath=/usr/local/grafana
    Restart=on-failure
    
    [Install]
    WantedBy=multi-user.target
    ```

11. Use the binary to manually start the Grafana server:
    
    ``` shell
    /usr/local/grafana/bin/grafana-server --homepath /usr/local/grafana
    ```
    
    {{\< admonition type="note" \>}}
    Manually invoking the binary in this step automatically creates the `/usr/local/grafana/data` directory, which needs to be created and configured before the installation can be considered complete.
    {{\< /admonition \>}}

12. Press `CTRL+C` to stop the Grafana server.

13. Change the owner of `/usr/local/grafana` to Grafana users again to apply the ownership to the newly created `/usr/local/grafana/data` directory:
    
    ``` shell
    sudo chown -R grafana:users /usr/local/grafana
    ```

14. [Configure the Grafana server to start at boot time using systemd](https://grafana.com/docs/grafana/latest/setup-grafana/start-restart-grafana/#configure-the-grafana-server-to-start-at-boot-using-systemd).

## Uninstall on Debian or Ubuntu

Complete any of the following steps to uninstall Grafana.

To uninstall Grafana, run the following commands in a terminal window:

1. If you configured Grafana to run with systemd, stop the systemd service for Grafana server:
   
   ``` shell
   sudo systemctl stop grafana-server
   ```

2. If you configured Grafana to run with init.d, stop the init.d service for Grafana server:
   
   ``` shell
   sudo service grafana-server stop
   ```

3. To uninstall Grafana OSS:
   
   ``` shell
   sudo apt-get remove grafana
   ```

4. To uninstall Grafana Enterprise:
   
   ``` shell
   sudo apt-get remove grafana-enterprise
   ```

5. Optional: To remove the Grafana repository:
   
   ``` bash
   sudo rm -i /etc/apt/sources.list.d/grafana.list
   ```

## Next steps

- [Start the Grafana server](../../start-restart-grafana/)

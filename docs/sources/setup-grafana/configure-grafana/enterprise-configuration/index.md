-----

aliases:

- ../../enterprise/enterprise-configuration/
  description: Learn about Grafana Enterprise configuration options that you can specify.
  labels:
  products:
  - enterprise
  - oss
    title: Configure Grafana Enterprise
    weight: 100

-----

# Configure Grafana Enterprise

This page describes Grafana Enterprise-specific configuration options that you can specify in a `.ini` configuration file or using environment variables. Refer to [Configuration](../) for more information about available configuration options.

## \[enterprise\]

### license\_path

Local filesystem path to Grafana Enterprise's license file.
Defaults to `<paths.data>/license.jwt`.

### license\_text

When set to the text representation (i.e. content of the license file)
of the license, Grafana will evaluate and apply the given license to
the instance.

### auto\_refresh\_license

When enabled, Grafana will send the license and usage statistics to
the license issuer. If the license has been updated on the issuer's
side to be valid for a different number of users or a new duration,
your Grafana instance will be updated with the new terms
automatically. Defaults to `true`.

{{% admonition type="note" %}}
The license only automatically updates once per day. To immediately update the terms for a license, use the Grafana UI to renew your license token.
{{% /admonition %}}

### license\_validation\_type

When set to `aws`, Grafana will validate its license status with Amazon Web Services (AWS) instead of with Grafana Labs. Only use this setting if you purchased an Enterprise license from AWS Marketplace. Defaults to empty, which means that by default Grafana Enterprise will validate using a license issued by Grafana Labs. For details about licenses issued by AWS, refer to [Activate a Grafana Enterprise license purchased through AWS Marketplace](../../../administration/enterprise-licensing/activate-aws-marketplace-license/).

## \[white\_labeling\]

### app\_title

Set to your company name to override application title.

### login\_logo

Set to complete URL to override login logo.

### login\_background

Set to complete CSS background expression to override login background. Example:

``` bash
[white_labeling]
login_background = url(http://www.bhmpics.com/wallpapers/starfield-1920x1080.jpg)
```

### menu\_logo

Set to complete URL to override menu logo.

### fav\_icon

Set to complete URL to override fav icon (icon shown in browser tab).

### apple\_touch\_icon

Set to complete URL to override Apple/iOS icon.

### hide\_edition

Set to `true` to remove the Grafana edition from appearing in the footer.

### footer\_links

List the link IDs to use here. Grafana will look for matching link configurations, the link IDs should be space-separated and contain no whitespace.

## \[usage\_insights.export\]

By [exporting usage logs](../../configure-security/export-logs/), you can directly query them and create dashboards of the information that matters to you most, such as dashboard errors, most active organizations, or your top-10 most-used queries.

### enabled

Enable the usage insights export feature.

### storage

Specify a storage type. Defaults to `loki`.

## \[usage\_insights.export.storage.loki\]

### type

Set the communication protocol to use with Loki, which is either `grpc` or `http`. Defaults to `grpc`.

### url

Set the address for writing logs to Loki (format must be host:port).

### tls

Decide whether or not to enable the TLS (Transport Layer Security) protocol when establishing the connection to Loki. Defaults to true.

### tenant\_id

Set the tenant ID for Loki communication, which is disabled by default. The tenant ID is required to interact with Loki running in [multi-tenant mode](/docs/loki/latest/operations/multi-tenancy/).

## \[analytics.summaries\]

### buffer\_write\_interval

Interval for writing dashboard usage stats buffer to database.

### buffer\_write\_timeout

Timeout for writing dashboard usage stats buffer to database.

### rollup\_interval

Interval for trying to roll up per dashboard usage summary. Only rolled up at most once per day.

### rollup\_timeout

Timeout for trying to rollup per dashboard usage summary.

## \[analytics.views\]

### recent\_users\_age

Age for recent active users.

## \[reporting\]

### enabled

Enable or disable the reporting feature. When disabled, no reports are generated, and the UI is hidden. By default, reporting is enabled (`true`).

### rendering\_timeout

Timeout for the following reporting rendering requests: generating PDFs, generating embedded dashboard images for report emails, and generating attached CSV files. Default is 10 seconds (`10s`).

### concurrent\_render\_limit

Maximum number of concurrent calls to the rendering service. Default is `4`.

### image\_scale\_factor

Scale factor for rendering images. Value `2` is enough for monitor resolutions, `4` would be better for printed material. Setting a higher value affects performance and memory. Default is `2`.

### max\_attachment\_size\_mb

Set the maximum file size in megabytes for the report email attachments. Default is `10`.

### fonts\_path

Path to the directory containing font files.

### font\_regular

Name of the TrueType font file with regular style. Default is `DejaVuSansCondensed.ttf`.

### font\_bold

Name of the TrueType font file with bold style.

### font\_italic

Name of the TrueType font file with italic style. Default is `DejaVuSansCondensed-Oblique.ttf`.

### max\_retries\_per\_panel

Maximum number of times the following reporting rendering requests are retried before returning an error: generating PDFs, generating embedded dashboard images for report emails, and generating attached CSV files. To disable the retry feature, enter `0`. This is available in public preview and requires the `reportingRetries` feature toggle. Default is `3`.

### allowed\_domains

Allowed domains to receive reports. Use an asterisk (`*`) to allow all domains. Use a comma-separated list to allow multiple domains. Example: `allowed_domains = grafana.com`, example.org. Default is `*`.

## \[auditing\]

[Auditing](../../configure-security/audit-grafana/) allows you to track important changes to your Grafana instance. By default, audit logs are logged to file but the auditing feature also supports sending logs directly to Loki.

### enabled

Enable the auditing feature. Defaults to false.

### loggers

List of enabled loggers.

### log\_dashboard\_content

Keep dashboard content in the logs (request or response fields). This can significantly increase the size of your logs.

### verbose

Log all requests and keep requests and responses body. This can significantly increase the size of your logs.

### log\_all\_status\_codes

Set to false to only log requests with 2xx, 3xx, 401, 403, 500 responses.

### max\_response\_size\_bytes

Maximum response body (in bytes) to be recorded. May help reducing the memory footprint caused by auditing.

## \[auditing.logs.file\]

### path

Path to logs folder.

### max\_files

Maximum log files to keep.

### max\_file\_size\_mb

Max size in megabytes per log file.

## \[auditing.logs.loki\]

### url

Set the URL for writing logs to Loki.

### tls

If true, it establishes a secure connection to Loki. Defaults to true.

### tenant\_id

Set the tenant ID for Loki communication, which is disabled by default. The tenant ID is required to interact with Loki running in [multi-tenant mode](/docs/loki/latest/operations/multi-tenancy/).

## \[auth.saml\]

### enabled

If true, the feature is enabled. Defaults to false.

### allow\_sign\_up

If true, allow new Grafana users to be created through SAML logins. Defaults to true.

### certificate

Base64-encoded public X.509 certificate. Used to sign requests to the IdP.

### certificate\_path

Path to the public X.509 certificate. Used to sign requests to the IdP.

### private\_key

Base64-encoded private key. Used to decrypt assertions from the IdP.

### private\_key\_path

Path to the private key. Used to decrypt assertions from the IdP.

### idp\_metadata

Base64-encoded IdP SAML metadata XML. Used to verify and obtain binding locations from the IdP.

### idp\_metadata\_path

Path to the SAML metadata XML. Used to verify and obtain binding locations from the IdP.

### idp\_metadata\_url

URL to fetch SAML IdP metadata. Used to verify and obtain binding locations from the IdP.

### max\_issue\_delay

Time since the IdP issued a response and the SP is allowed to process it. Defaults to 90 seconds.

### metadata\_valid\_duration

How long the SPs metadata is valid. Defaults to 48 hours.

### assertion\_attribute\_name

Friendly name or name of the attribute within the SAML assertion to use as the user name. Alternatively, this can be a template with variables that match the names of attributes within the SAML assertion.

### assertion\_attribute\_login

Friendly name or name of the attribute within the SAML assertion to use as the user login handle.

### assertion\_attribute\_email

Friendly name or name of the attribute within the SAML assertion to use as the user email.

### assertion\_attribute\_groups

Friendly name or name of the attribute within the SAML assertion to use as the user groups.

### assertion\_attribute\_role

Friendly name or name of the attribute within the SAML assertion to use as the user roles.

### assertion\_attribute\_org

Friendly name or name of the attribute within the SAML assertion to use as the user organization.

### allowed\_organizations

List of comma- or space-separated organizations. Each user must be a member of at least one organization to log in.

### org\_mapping

List of comma- or space-separated Organization:OrgId:Role mappings. Organization can be `*` meaning "All users". Role is optional and can have the following values: `Admin`, `Editor` ,`Viewer` or `None`.

### role\_values\_none

List of comma- or space-separated roles that will be mapped to the None role.

### role\_values\_viewer

List of comma- or space-separated roles that will be mapped to the Viewer role.

### role\_values\_editor

List of comma- or space-separated roles that will be mapped to the Editor role.

### role\_values\_admin

List of comma- or space-separated roles that will be mapped to the Admin role.

### role\_values\_grafana\_admin

List of comma- or space-separated roles that will be mapped to the Grafana Admin (Super Admin) role.

## \[keystore.vault\]

### url

Location of the Vault server.

### namespace

Vault namespace if using Vault with multi-tenancy.

### auth\_method

Method for authenticating towards Vault. Vault is inactive if this option is not set. Current possible values: `token`.

### token

Secret token to connect to Vault when auth\_method is `token`.

### lease\_renewal\_interval

Time between checking if there are any secrets which needs to be renewed.

### lease\_renewal\_expires\_within

Time until expiration for tokens which are renewed. Should have a value higher than lease\_renewal\_interval.

### lease\_renewal\_increment

New duration for renewed tokens. Vault may be configured to ignore this value and impose a stricter limit.

## \[security.egress\]

Security egress makes it possible to control outgoing traffic from the Grafana server.

### host\_deny\_list

A list of hostnames or IP addresses separated by spaces for which requests are blocked.

### host\_allow\_list

A list of hostnames or IP addresses separated by spaces for which requests are allowed. All other requests are blocked.

### header\_drop\_list

A list of headers that are stripped from the outgoing data source and alerting requests.

### cookie\_drop\_list

A list of cookies that are stripped from the outgoing data source and alerting requests.

## \[security.encryption\]

### algorithm

Encryption algorithm used to encrypt secrets stored in the database and cookies. Possible values are `aes-cfb` (default) and `aes-gcm`. AES-CFB stands for *Advanced Encryption Standard* in *cipher feedback* mode, and AES-GCM stands for *Advanced Encryption Standard* in *Galois/Counter Mode*.

## \[caching\]

When query caching is enabled, Grafana can temporarily store the results of data source queries and serve cached responses to similar requests.

### backend

The caching backend to use when storing cached queries. Options: `memory`, `redis`, and `memcached`.

The default is `memory`.

### enabled

Setting 'enabled' to `true` allows users to configure query caching for data sources.

This value is `true` by default.

{{% admonition type="note" %}}
This setting enables the caching feature, but it does not turn on query caching for any data source. To turn on query caching for a data source, update the setting on the data source configuration page. For more information, refer to the [query caching docs](../../../administration/data-source-management/#enable-and-configure-query-caching).
{{% /admonition %}}

### ttl

*Time to live* (TTL) is the time that a query result is stored in the caching system before it is deleted or refreshed. This setting defines the time to live for query caching, when TTL is not configured in data source settings. The default value is `1m` (1 minute).

### max\_ttl

The max duration that a query result is stored in the caching system before it is deleted or refreshed. This value will override `ttl` config option or data source setting if the `ttl` value is greater than `max_ttl`. To disable this constraint, set this value to `0s`.

The default is `0s` (disabled).

{{% admonition type="note" %}}
Disabling this constraint is not recommended in production environments.
{{% /admonition %}}

### max\_value\_mb

This value limits the size of a single cache value. If a cache value (or query result) exceeds this size, then it is not cached. To disable this limit, set this value to `0`.

The default is `1`.

### connection\_timeout

This setting defines the duration to wait for a connection to the caching backend.

The default is `5s`.

### read\_timeout

This setting defines the duration to wait for the caching backend to return a cached result. To disable this timeout, set this value to `0s`.

The default is `0s` (disabled).

{{% admonition type="note" %}}
Disabling this timeout is not recommended in production environments.
{{% /admonition %}}

### write\_timeout

This setting defines the number of seconds to wait for the caching backend to store a result. To disable this timeout, set this value to `0s`.

The default is `0s` (disabled).

{{% admonition type="note" %}}
Disabling this timeout is not recommended in production environments.
{{% /admonition %}}

## \[caching.encryption\]

### enabled

When 'enabled' is `true`, query values in the cache are encrypted.

The default is `false`.

### encryption\_key

A string used to generate a key for encrypting the cache. For the encrypted cache data to persist between Grafana restarts, you must specify this key. If it is empty when encryption is enabled, then the key is automatically generated on startup, and the cache clears upon restarts.

The default is `""`.

## \[caching.memory\]

### gc\_interval

When storing cache data in-memory, this setting defines how often a background process cleans up stale data from the in-memory cache. More frequent "garbage collection" can keep memory usage from climbing but will increase CPU usage.

The default is `1m`.

### max\_size\_mb

The maximum size of the in-memory cache in megabytes. Once this size is reached, new cache items are rejected. For more flexible control over cache eviction policies and size, use the Redis or Memcached backend.

To disable the maximum, set this value to `0`.

The default is `25`.

{{% admonition type="note" %}}
Disabling the maximum is not recommended in production environments.
{{% /admonition %}}

## \[caching.redis\]

### url

The full Redis URL of your Redis server. For example: `redis://username:password@localhost:6379`. To enable TLS, use the `rediss` scheme.

The default is `"redis://localhost:6379"`.

### cluster

A comma-separated list of Redis cluster members, either in `host:port` format or using the full Redis URLs (`redis://username:password@localhost:6379`). For example, `localhost:7000, localhost: 7001, localhost:7002`.
If you use the full Redis URLs, then you can specify the scheme, username, and password only once. For example, `redis://username:password@localhost:0000,localhost:1111,localhost:2222`. You cannot specify a different username and password for each URL.

{{% admonition type="note" %}}
If you have specify `cluster`, the value for `url` is ignored.
{{% /admonition %}}

{{% admonition type="note" %}}
You can enable TLS for cluster mode using the `rediss` scheme in Grafana Enterprise v8.5 and later versions.
{{% /admonition %}}

### prefix

A string that prefixes all Redis keys. This value must be set if using a shared database in Redis. If `prefix` is empty, then one will not be used.

The default is `"grafana"`.

## \[caching.memcached\]

### servers

A space-separated list of memcached servers. Example: `memcached-server-1:11211 memcached-server-2:11212 memcached-server-3:11211`. Or if there's only one server: `memcached-server:11211`.

The default is `"localhost:11211"`.

{{% admonition type="note" %}}
The following memcached configuration requires the `tlsMemcached` feature toggle.
{{% /admonition %}}

### tls\_enabled

Enables TLS authentication for memcached. Defaults to `false`.

### tls\_cert\_path

Path to the client certificate, which will be used for authenticating with the server. Also requires the key path to be configured.

### tls\_key\_path

Path to the key for the client certificate. Also requires the client certificate to be configured.

### tls\_ca\_path

Path to the CA certificates to validate the server certificate against. If not set, the host's root CA certificates are used.

### tls\_server\_name

Override the expected name on the server certificate.

### connection\_timeout

Timeout for the memcached client to connect to memcached. Defaults to `0`, which uses the memcached client default timeout per connection scheme.

## \[recorded\_queries\]

### enabled

Whether the recorded queries feature is enabled

### min\_interval

Sets the minimum interval to enforce between query evaluations. The default value is `10s`. Query evaluation will be
adjusted if they are less than this value. Higher values can help with resource management.

The interval string is a possibly signed sequence of decimal numbers, followed by a unit suffix (ms, s, m, h, d), e.g.
30s or 1m.

### max\_queries

The maximum number of recorded queries that can exist.

### default\_remote\_write\_datasource\_uid

The UID of the datasource where the query data will be written.

If all `default_remote_write_*` properties are set, this information will be populated at startup. If a remote write target has
already been configured, nothing will happen.

### default\_remote\_write\_path

The api path where metrics will be written

If all `default_remote_write_*` properties are set, this information will be populated at startup. If a remote write target has
already been configured, nothing will happen.

### default\_remote\_write\_datasource\_org\_id

The org id of the datasource where the query data will be written.

If all `default_remote_write_*` properties are set, this information will be populated at startup. If a remote write target has
already been configured, nothing will happen.

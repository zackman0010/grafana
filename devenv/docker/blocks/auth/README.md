# Auth Docker blocks

This collection of Docker images will help create a developer environment to
interact with different Authentication Providers.

## Usage

Spin up a service with the following command from the base directory of this
repository.

``` bash
make devenv=auth/oauth
```

This will add the `oauth/docker-compose` block to the `docker-compose` file used
by the `devenv` target.

## Available Authentication Providers

- [apache\_proxy](./apache_proxy)
- [apache\_proxy\_mac](./apache_proxy_mac)
- [freeipa](./freeipa)
- [jwt\_proxy](./jwt_proxy)
- [oauth](./oauth)
- [nginx\_proxy](./nginx_proxy)
- [nginx\_proxy\_mac](./nginx_proxy_mac)
- [oauth](./oauth)
- [openldap](./openldap)
- [openldap-multiple](./openldap-multiple)
- [prometheus\_basic\_auth\_proxy](./prometheus_basic_auth_proxy)

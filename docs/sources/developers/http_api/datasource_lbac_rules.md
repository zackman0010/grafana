-----

aliases:

- ../../http\_api/datasource\_lbac\_rules/
  canonical: /docs/grafana/latest/developers/http\_api/datasource\_lbac\_rules/
  description: Data Source LBAC rules API
  keywords:
- grafana
- http
- documentation
- api
- datasource
- lbac
- acl
- enterprise
  labels:
  products:
  - cloud
    title: Datasource LBAC rules HTTP API

-----

# Data Source LBAC rules API

> The Data Source LBAC rules are only available in Grafana Cloud. Only cloud loki data sources are supported.

LBAC (Label-Based Access Control) rules can be set for teams.

## Get LBAC rules for a data source

`GET /api/datasources/uid/:uid/lbac/teams`

Gets all existing LBAC rules for the data source with the given `uid`.

**Required permissions**

| Action           | Scope                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| datasources:read | datasources:*<br>datasources:uid:*<br>datasources:uid:my\_datasource (single data source) |

### Examples

**Example request:**

    GET /api/datasources/uid/my_datasource/lbac/teams HTTP/1.1
    Accept: application/json
    Content-Type: application/json
    Authorization: Bearer eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk

**Example response:**

``` http
HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8
Content-Length: 131

{
  "rules": [
    {
      "teamUId": "fdnd1pf4m9sxvc",
      "rules": [
        "{ service_name=\"bigquery-sync-mysql\" }"
      ]
    },
    {
      "teamUid": "dfed1p2m9sxvfc",
      "rules": [
        "{ service_name=\"api\" }"
      ]
    }
  ]
}
```

## Update LBAC rules for a data source

`PUT /api/datasources/uid/:uid/lbac/teams`

Updates LBAC rules for teams associated with the data source with the given `uid`. Here you submit a list of teams and the rules for each team.
Deleting a team from the list will remove the team's LBAC rules. You have to submit all teams and their rules to be updated, to remove a team's rules, you have to submit the current list of rules without the team.

**Required permissions**

| Action                        | Scope                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| datasources:write             | datasources:*<br>datasources:uid:*<br>datasources:uid:my\_datasource (single data source) |
| datasources.permissions:write | datasources:*<br>datasources:uid:*<br>datasources:uid:my\_datasource (single data source) |

### Examples

**Example request:**

``` http
PUT /api/datasources/uid/my_datasource/lbac/teams
Accept: application/json
Content-Type: application/json
Authorization: Bearer eyJrIjoiT0tTcG1pUlY2RnVKZTFVaDFsNFZXdE9ZWmNrMkZYbk

{
  "rules": [
    {
      "teamUId": "fdnd1pf4m9sxvc",
      "rules": [
        "{ service_name=\"bigquery-sync-mysql\" }"
      ]
    },
    {
      "teamUid": "dfed1p2m9sxvfc",
      "rules": [
        "{ service_name=\"api\" }"
      ]
    }
  ]
}
```

**Example response:**

``` http
HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8
Content-Length: 35

{
  "id": 1,
  "message": "Data source LBAC rules updated",
  "name": "loki",
  "rules": [
    {
      "teamUId": "fdnd1pf4m9sxvc",
      "rules": [
        "{ service_name=\"bigquery-sync-mysql\" }"
      ]
    },
    {
      "teamUid": "dfed1p2m9sxvfc",
      "rules": [
        "{ service_name=\"api\" }"
      ]
    }
  ],
  "uid": "ee1nm1t7spog0e",
}
```

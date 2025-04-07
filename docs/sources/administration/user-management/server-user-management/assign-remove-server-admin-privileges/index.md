-----

aliases:

- ../../manage-users-and-permissions/manage-server-users/assign-remove-server-admin-privileges/
  description: Describes how to assign and remove Grafana administrator privileges from
  a server user.
  labels:
  products:
  - enterprise
  - oss
    title: Assign or remove Grafana server administrator privileges
    weight: 20

-----

# Assign or remove Grafana server administrator privileges

Grafana server administrators are responsible for creating users, organizations, and managing permissions. For more information about the server administration role, refer to [Grafana server administrators](../../../roles-and-permissions/#grafana-server-administrators).

{{% admonition type="note" %}}
Server administrators are "super-admins" with full permissions to create, read, update, and delete all resources and users in all organizations, as well as update global settings such as licenses. Only grant this permission to trusted users.
{{% /admonition %}}

## Before you begin

- [Add a user](../#add-a-user)
- Ensure you have Grafana server administrator privileges

**To assign or remove Grafana administrator privileges**:

1. Sign in to Grafana as a server administrator.
2. Click **Administration** in the left-side menu, **Users and access**, and then **Users**.
3. Click a user.
4. In the Permissions section, next to Grafana Admin, click **Change**.
5. Click **Yes** or **No**, depending on whether or not you want this user to have the Grafana server administrator role.
6. Click **Change**.

The system updates the user's permission the next time they load a page in Grafana.

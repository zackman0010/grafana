package sql

type queryAllowTest struct {
	name  string
	query string
	allow bool
}

var django_allow_tests = []queryAllowTest{
	{
		name:  "SetAutocommit1",
		query: "set autocommit=1",
	},
	{
		name:  "SelectSQLAutoIsNull",
		query: "SELECT @@SQL_AUTO_IS_NULL",
	},
	{
		name:  "SetSessionTransactionIsolationLevelReadCommitted",
		query: "SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED",
	},
	{
		name:  "SelectSQLMode",
		query: "SELECT @@sql_mode",
	},
	{
		name:  "ShowFullTables",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "ShowFullTables2",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "ShowFullTables3",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "CreateTableDjangoMigrations",
		query: "CREATE TABLE `django_migrations` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `app` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, `applied` datetime(6) NOT NULL)",
	},
	{
		name:  "SelectEngineDjangoMigrations",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_migrations'",
	},
	{
		name:  "SelectEngineDjangoMigrations2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_migrations'",
	},
	{
		name:  "SelectEngineDjangoMigrations3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_migrations'",
	},
	{
		name:  "SelectEngineDjangoMigrations4",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_migrations'",
	},
	{
		name:  "CreateTableAccountsUserprofile",
		query: "CREATE TABLE `accounts_userprofile` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `password` varchar(128) NOT NULL, `last_login` datetime(6) NULL, `email` varchar(255) NOT NULL UNIQUE, `first_name` varchar(255) NULL, `last_name` varchar(255) NULL, `active` bool NOT NULL, `staff` bool NOT NULL, `admin` bool NOT NULL, `timestamp` datetime(6) NOT NULL)",
	},
	{
		name:  "SelectEngineAccountsUserprofile",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "SelectEngineAccountsUserprofile2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "SelectEngineAccountsUserprofile3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "SelectEngineAccountsUserprofile4",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "SelectEngineAccountsUserprofile5",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "SelectEngineAccountsUserprofile6",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "SelectEngineAccountsUserprofile7",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "SelectEngineAccountsUserprofile8",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "SelectEngineAccountsUserprofile9",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "SelectEngineAccountsUserprofile10",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "ShowFullTables4",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAccounts0001",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('accounts', '0001_initial', '2019-09-11 20:08:24.240837')",
	},
	{
		name:  "AlterTableAccountsUserprofileAddUid",
		query: "ALTER TABLE `accounts_userprofile` ADD COLUMN `uid` varchar(8) DEFAULT 'bfghjkl' NOT NULL UNIQUE",
	},
	{
		name:  "AlterTableAccountsUserprofileAlterUidDropDefault",
		query: "ALTER TABLE `accounts_userprofile` ALTER COLUMN `uid` DROP DEFAULT",
	},
	{
		name:  "SelectEngineAccountsUserprofile11",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "ShowFullTables5",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAccounts0002",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('accounts', '0002_userprofile_uid', '2019-09-11 20:08:24.390839')",
	},
	{
		name:  "AlterTableAccountsUserprofileAddBio",
		query: "ALTER TABLE `accounts_userprofile` ADD COLUMN `bio` varchar(255) NULL",
	},
	{
		name:  "SelectEngineAccountsUserprofile12",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'accounts_userprofile'",
	},
	{
		name:  "ShowFullTables6",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAccounts0003",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('accounts', '0003_userprofile_bio', '2019-09-11 20:08:24.521784')",
	},
	{
		name:  "CreateTableDjangoContentType",
		query: "CREATE TABLE `django_content_type` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `name` varchar(100) NOT NULL, `app_label` varchar(100) NOT NULL, `model` varchar(100) NOT NULL)",
	},
	{
		name:  "SelectEngineDjangoContentType",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_content_type'",
	},
	{
		name:  "SelectEngineDjangoContentType2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_content_type'",
	},
	{
		name:  "SelectEngineDjangoContentType3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_content_type'",
	},
	{
		name:  "SelectEngineDjangoContentType4",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_content_type'",
	},
	{
		name:  "AlterTableDjangoContentTypeAddConstraint",
		query: "ALTER TABLE `django_content_type` ADD CONSTRAINT `django_content_type_app_label_model_76bd3d3b_uniq` UNIQUE (`app_label`, `model`)",
	},
	{
		name:  "ShowFullTables7",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsContenttypes0001",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('contenttypes', '0001_initial', '2019-09-11 20:08:24.640638')",
	},
	{
		name:  "CreateTableDjangoAdminLog",
		query: "CREATE TABLE `django_admin_log` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `action_time` datetime(6) NOT NULL, `object_id` longtext NULL, `object_repr` varchar(200) NOT NULL, `action_flag` smallint UNSIGNED NOT NULL, `change_message` longtext NOT NULL, `content_type_id` integer NULL, `user_id` integer NOT NULL)",
	},
	{
		name:  "SelectEngineDjangoAdminLog",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_admin_log'",
	},
	{
		name:  "SelectEngineDjangoAdminLog2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_admin_log'",
	},
	{
		name:  "SelectEngineDjangoAdminLog3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_admin_log'",
	},
	{
		name:  "SelectEngineDjangoAdminLog4",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_admin_log'",
	},
	{
		name:  "SelectEngineDjangoAdminLog5",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_admin_log'",
	},
	{
		name:  "SelectEngineDjangoAdminLog6",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_admin_log'",
	},
	{
		name:  "SelectEngineDjangoAdminLog7",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_admin_log'",
	},
	{
		name:  "SelectEngineDjangoAdminLog8",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_admin_log'",
	},
	{
		name:  "ShowFullTables8",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAdmin0001",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('admin', '0001_initial', '2019-09-11 20:08:24.711570')",
	},
	{
		name:  "AlterTableDjangoAdminLogAddConstraint1",
		query: "ALTER TABLE `django_admin_log` ADD CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)",
	},
	{
		name:  "AlterTableDjangoAdminLogAddConstraint2",
		query: "ALTER TABLE `django_admin_log` ADD CONSTRAINT `django_admin_log_user_id_c564eba6_fk_accounts_userprofile_id` FOREIGN KEY (`user_id`) REFERENCES `accounts_userprofile` (`id`)",
	},
	{
		name:  "ShowFullTables9",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAdmin0002",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('admin', '0002_logentry_remove_auto_add', '2019-09-11 20:08:24.993999')",
	},
	{
		name:  "ShowFullTables10",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAdmin0003",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('admin', '0003_logentry_add_action_flag_choices', '2019-09-11 20:08:25.005500')",
	},
	{
		name:  "AlterTableDjangoContentTypeModifyName",
		query: "ALTER TABLE `django_content_type` MODIFY `name` varchar(100) NULL",
	},
	{
		name:  "SetAutocommit0",
		query: "set autocommit=0",
	},
	{
		name:  "Commit",
		query: "commit",
	},
	{
		name:  "SetAutocommit1Again",
		query: "set autocommit=1",
	},
	{
		name:  "AlterTableDjangoContentTypeDropName",
		query: "ALTER TABLE `django_content_type` DROP COLUMN `name`",
	},
	{
		name:  "ShowFullTables11",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsContenttypes0002",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('contenttypes', '0002_remove_content_type_name', '2019-09-11 20:08:25.195532')",
	},
	{
		name:  "CreateTableAuthPermission",
		query: "CREATE TABLE `auth_permission` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `name` varchar(50) NOT NULL, `content_type_id` integer NOT NULL, `codename` varchar(100) NOT NULL)",
	},
	{
		name:  "SelectEngineAuthPermission",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'auth_permission'",
	},
	{
		name:  "SelectEngineAuthPermission2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'auth_permission'",
	},
	{
		name:  "SelectEngineAuthPermission3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'auth_permission'",
	},
	{
		name:  "SelectEngineAuthPermission4",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'auth_permission'",
	},
	{
		name:  "CreateTableAuthGroup",
		query: "CREATE TABLE `auth_group` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `name` varchar(80) NOT NULL UNIQUE)",
	},
	{
		name:  "SelectEngineAuthGroup",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'auth_group'",
	},
	{
		name:  "SelectEngineAuthGroup2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'auth_group'",
	},
	{
		name:  "CreateTableAuthGroupPermissions",
		query: "CREATE TABLE `auth_group_permissions` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `group_id` integer NOT NULL, `permission_id` integer NOT NULL)",
	},
	{
		name:  "SelectEngineAuthGroupPermissions",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'auth_group_permissions'",
	},
	{
		name:  "SelectEngineAuthGroupPermissions2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'auth_group_permissions'",
	},
	{
		name:  "SelectEngineAuthGroupPermissions3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'auth_group_permissions'",
	},
	{
		name:  "ShowFullTables12",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0001",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0001_initial', '2019-09-11 20:08:25.380981')",
	},
	{
		name:  "AlterTableAuthPermissionAddConstraint",
		query: "ALTER TABLE `auth_permission` ADD CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)",
	},
	{
		name:  "AlterTableAuthPermissionAddUniqueConstraint",
		query: "ALTER TABLE `auth_permission` ADD CONSTRAINT `auth_permission_content_type_id_codename_01ab375a_uniq` UNIQUE (`content_type_id`, `codename`)",
	},
	{
		name:  "AlterTableAuthGroupPermissionsAddConstraint1",
		query: "ALTER TABLE `auth_group_permissions` ADD CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)",
	},
	{
		name:  "AlterTableAuthGroupPermissionsAddConstraint2",
		query: "ALTER TABLE `auth_group_permissions` ADD CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`)",
	},
	{
		name:  "AlterTableAuthGroupPermissionsAddUniqueConstraint",
		query: "ALTER TABLE `auth_group_permissions` ADD CONSTRAINT `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` UNIQUE (`group_id`, `permission_id`)",
	},
	{
		name:  "AlterTableAuthPermissionModifyName",
		query: "ALTER TABLE `auth_permission` MODIFY `name` varchar(255) NOT NULL",
	},
	{
		name:  "ShowFullTables13",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0002",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0002_alter_permission_name_max_length', '2019-09-11 20:08:25.927116')",
	},
	{
		name:  "ShowFullTables14",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0003",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0003_alter_user_email_max_length', '2019-09-11 20:08:25.944751')",
	},
	{
		name:  "ShowFullTables15",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0004",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0004_alter_user_username_opts', '2019-09-11 20:08:25.954957')",
	},
	{
		name:  "ShowFullTables16",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0005",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0005_alter_user_last_login_null', '2019-09-11 20:08:25.966743')",
	},
	{
		name:  "ShowFullTables17",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0006",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0006_require_contenttypes_0002', '2019-09-11 20:08:25.970363')",
	},
	{
		name:  "ShowFullTables18",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0007",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0007_alter_validators_add_error_messages', '2019-09-11 20:08:25.977706')",
	},
	{
		name:  "ShowFullTables19",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0008",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0008_alter_user_username_max_length', '2019-09-11 20:08:25.988202')",
	},
	{
		name:  "ShowFullTables20",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0009",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0009_alter_user_last_name_max_length', '2019-09-11 20:08:25.996464')",
	},
	{
		name:  "AlterTableAuthGroupModifyName",
		query: "ALTER TABLE `auth_group` MODIFY `name` varchar(150) NOT NULL",
	},
	{
		name:  "ShowFullTables21",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0010",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0010_alter_group_name_max_length', '2019-09-11 20:08:26.006057')",
	},
	{
		name:  "SetAutocommit0_2",
		query: "set autocommit=0",
	},
	{
		name:  "Commit2",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_2",
		query: "set autocommit=1",
	},
	{
		name:  "ShowFullTables22",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsAuth0011",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('auth', '0011_update_proxy_permissions', '2019-09-11 20:08:26.019693')",
	},
	{
		name:  "CreateTablePostPost",
		query: "CREATE TABLE `post_post` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `title` varchar(250) NOT NULL, `body` longtext NOT NULL, `slug` varchar(8) NOT NULL UNIQUE, `pub_date` datetime(6) NOT NULL, `thumbnail` varchar(100) NOT NULL, `author_id` integer NOT NULL)",
	},
	{
		name:  "SelectEnginePostPost",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'post_post'",
	},
	{
		name:  "SelectEnginePostPost2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'post_post'",
	},
	{
		name:  "SelectEnginePostPost3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'post_post'",
	},
	{
		name:  "SelectEnginePostPost4",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'post_post'",
	},
	{
		name:  "SelectEnginePostPost5",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'post_post'",
	},
	{
		name:  "SelectEnginePostPost6",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'post_post'",
	},
	{
		name:  "SelectEnginePostPost7",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'post_post'",
	},
	{
		name:  "ShowFullTables23",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsPost0001",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('post', '0001_initial', '2019-09-11 20:08:26.078601')",
	},
	{
		name:  "AlterTablePostPostAddConstraint",
		query: "ALTER TABLE `post_post` ADD CONSTRAINT `post_post_author_id_99d134d5_fk_accounts_userprofile_id` FOREIGN KEY (`author_id`) REFERENCES `accounts_userprofile` (`id`)",
	},
	{
		name:  "ShowFullTables24",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsPost0002",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('post', '0002_auto_20180225_1142', '2019-09-11 20:08:26.223293')",
	},
	{
		name:  "ShowFullTables25",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsPost0003",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('post', '0003_auto_20180225_1154', '2019-09-11 20:08:26.231490')",
	},
	{
		name:  "ShowFullTables26",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsPost0004",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('post', '0004_auto_20180225_1256', '2019-09-11 20:08:26.241872')",
	},
	{
		name:  "CreateTableBookmarkPost",
		query: "CREATE TABLE `bookmark_post` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `obj_id` integer NOT NULL, `user_id` integer NOT NULL)",
	},
	{
		name:  "SelectEngineBookmarkPost",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'bookmark_post'",
	},
	{
		name:  "SelectEngineBookmarkPost2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'bookmark_post'",
	},
	{
		name:  "SelectEngineBookmarkPost3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'bookmark_post'",
	},
	{
		name:  "ShowFullTables27",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsBookmarks0001",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('bookmarks', '0001_initial', '2019-09-11 20:08:26.303419')",
	},
	{
		name:  "AlterTableBookmarkPostAddConstraint1",
		query: "ALTER TABLE `bookmark_post` ADD CONSTRAINT `bookmark_post_obj_id_cff442ed_fk_post_post_id` FOREIGN KEY (`obj_id`) REFERENCES `post_post` (`id`)",
	},
	{
		name:  "AlterTableBookmarkPostAddConstraint2",
		query: "ALTER TABLE `bookmark_post` ADD CONSTRAINT `bookmark_post_user_id_ecbdae36_fk_accounts_userprofile_id` FOREIGN KEY (`user_id`) REFERENCES `accounts_userprofile` (`id`)",
	},
	{
		name:  "SelectKeyColumnUsageBookmarkPost",
		query: "SELECT kc.`constraint_name`, kc.`column_name`,                 kc.`referenced_table_name`, kc.`referenced_column_name`             FROM information_schema.key_column_usage AS kc             WHERE                 kc.table_schema = DATABASE() AND                 kc.table_name = 'bookmark_post'             ORDER BY kc.`ordinal_position`",
	},
	{
		name:  "SelectTableConstraintsBookmarkPost",
		query: "SELECT c.constraint_name, c.constraint_type             FROM information_schema.table_constraints AS c             WHERE                 c.table_schema = DATABASE() AND                 c.table_name = 'bookmark_post'",
	},
	{
		name:  "ShowIndexBookmarkPost",
		query: "SHOW INDEX FROM `bookmark_post`",
	},
	{
		name:  "AlterTableBookmarkPostDropForeignKey",
		query: "ALTER TABLE `bookmark_post` DROP FOREIGN KEY `bookmark_post_obj_id_cff442ed_fk_post_post_id`",
	},
	{
		name:  "AlterTableBookmarkPostAddConstraint3",
		query: "ALTER TABLE `bookmark_post` ADD CONSTRAINT `bookmark_post_obj_id_cff442ed_fk_post_post_id` FOREIGN KEY (`obj_id`) REFERENCES `post_post` (`id`)",
	},
	{
		name:  "ShowFullTables28",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsBookmarks0002",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('bookmarks', '0002_auto_20180307_0102', '2019-09-11 20:08:26.751223')",
	},
	{
		name:  "CreateTableCommentsComment",
		query: "CREATE TABLE `comments_comment` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `object_id` integer UNSIGNED NOT NULL, `content` longtext NOT NULL, `timestamp` datetime(6) NOT NULL, `content_type_id` integer NOT NULL, `user_id` integer NOT NULL)",
	},
	{
		name:  "SelectEngineCommentsComment",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'comments_comment'",
	},
	{
		name:  "SelectEngineCommentsComment2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'comments_comment'",
	},
	{
		name:  "SelectEngineCommentsComment3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'comments_comment'",
	},
	{
		name:  "SelectEngineCommentsComment4",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'comments_comment'",
	},
	{
		name:  "SelectEngineCommentsComment5",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'comments_comment'",
	},
	{
		name:  "SelectEngineCommentsComment6",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'comments_comment'",
	},
	{
		name:  "ShowFullTables29",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsComments0001",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('comments', '0001_initial', '2019-09-11 20:08:26.827533')",
	},
	{
		name:  "AlterTableCommentsCommentAddConstraint1",
		query: "ALTER TABLE `comments_comment` ADD CONSTRAINT `comments_comment_content_type_id_72fd5dbe_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)",
	},
	{
		name:  "AlterTableCommentsCommentAddConstraint2",
		query: "ALTER TABLE `comments_comment` ADD CONSTRAINT `comments_comment_user_id_a1db4881_fk_accounts_userprofile_id` FOREIGN KEY (`user_id`) REFERENCES `accounts_userprofile` (`id`)",
	},
	{
		name:  "AlterTableCommentsCommentAddColumnParentCommentId",
		query: "ALTER TABLE `comments_comment` ADD COLUMN `parent_comment_id` integer NULL",
	},
	{
		name:  "SelectEngineCommentsComment7",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'comments_comment'",
	},
	{
		name:  "ShowFullTables30",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsComments0002",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('comments', '0002_comment_parent_comment', '2019-09-11 20:08:27.232388')",
	},
	{
		name:  "AlterTableCommentsCommentAddConstraint3",
		query: "ALTER TABLE `comments_comment` ADD CONSTRAINT `comments_comment_parent_comment_id_71289d4a_fk_comments_` FOREIGN KEY (`parent_comment_id`) REFERENCES `comments_comment` (`id`)",
	},
	{
		name:  "ShowFullTables31",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsComments0003",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('comments', '0003_auto_20180227_2159', '2019-09-11 20:08:27.408413')",
	},
	{
		name:  "CreateTableLikesdislikesLikedislike",
		query: "CREATE TABLE `likesdislikes_likedislike` (`id` integer AUTO_INCREMENT NOT NULL PRIMARY KEY, `vote` smallint NOT NULL, `object_id` integer UNSIGNED NOT NULL, `content_type_id` integer NOT NULL, `user_id` integer NOT NULL)",
	},
	{
		name:  "SelectEngineLikesdislikesLikedislike",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'likesdislikes_likedislike'",
	},
	{
		name:  "SelectEngineLikesdislikesLikedislike2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'likesdislikes_likedislike'",
	},
	{
		name:  "SelectEngineLikesdislikesLikedislike3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'likesdislikes_likedislike'",
	},
	{
		name:  "SelectEngineLikesdislikesLikedislike4",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'likesdislikes_likedislike'",
	},
	{
		name:  "SelectEngineLikesdislikesLikedislike5",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'likesdislikes_likedislike'",
	},
	{
		name:  "ShowFullTables32",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsLikesdislikes0001",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('likesdislikes', '0001_initial', '2019-09-11 20:08:27.471337')",
	},
	{
		name:  "AlterTableLikesdislikesLikedislikeAddConstraint1",
		query: "ALTER TABLE `likesdislikes_likedislike` ADD CONSTRAINT `likesdislikes_likedi_content_type_id_1bd751d8_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)",
	},
	{
		name:  "AlterTableLikesdislikesLikedislikeAddConstraint2",
		query: "ALTER TABLE `likesdislikes_likedislike` ADD CONSTRAINT `likesdislikes_likedi_user_id_fbedd04e_fk_accounts_` FOREIGN KEY (`user_id`) REFERENCES `accounts_userprofile` (`id`)",
	},
	{
		name:  "CreateTableDjangoSession",
		query: "CREATE TABLE `django_session` (`session_key` varchar(40) NOT NULL PRIMARY KEY, `session_data` longtext NOT NULL, `expire_date` datetime(6) NOT NULL)",
	},
	{
		name:  "SelectEngineDjangoSession",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_session'",
	},
	{
		name:  "SelectEngineDjangoSession2",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_session'",
	},
	{
		name:  "SelectEngineDjangoSession3",
		query: "SELECT engine FROM information_schema.tables WHERE table_name = 'django_session'",
	},
	{
		name:  "ShowFullTables33",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "InsertDjangoMigrationsSessions0001",
		query: "INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES ('sessions', '0001_initial', '2019-09-11 20:08:27.790749')",
	},
	{
		name:  "CreateIndexDjangoSessionExpireDate",
		query: "CREATE INDEX `django_session_expire_date_a5c62663` ON `django_session` (`expire_date`)",
	},
	{
		name:  "ShowFullTables34",
		query: "SHOW FULL TABLES",
	},
	{
		name:  "SelectDjangoMigrationsAppName",
		query: "SELECT `django_migrations`.`app`, `django_migrations`.`name` FROM `django_migrations`",
	},
	{
		name:  "SelectDjangoContentTypeForAdmin",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'admin'",
	},
	{
		name:  "SetAutocommit0_3",
		query: "set autocommit=0",
	},
	{
		name:  "InsertDjangoContentTypeAdminLogentry",
		query: "INSERT INTO `django_content_type` (`app_label`, `model`) VALUES ('admin', 'logentry')",
	},
	{
		name:  "Commit3",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_3",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeAdminLogentry",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'admin' AND `django_content_type`.`model` = 'logentry')",
	},
	{
		name:  "SelectAuthPermissionForAdmin",
		query: "SELECT `auth_permission`.`content_type_id`, `auth_permission`.`codename` FROM `auth_permission` INNER JOIN `django_content_type` ON (`auth_permission`.`content_type_id` = `django_content_type`.`id`) WHERE `auth_permission`.`content_type_id` IN (1) ORDER BY `django_content_type`.`app_label` ASC, `django_content_type`.`model` ASC, `auth_permission`.`codename` ASC",
	},
	{
		name:  "SetAutocommit0_4",
		query: "set autocommit=0",
	},
	{
		name:  "InsertAuthPermissionAdmin",
		query: "INSERT INTO `auth_permission` (`name`, `content_type_id`, `codename`) VALUES ('Can add log entry', 1, 'add_logentry'), ('Can change log entry', 1, 'change_logentry'), ('Can delete log entry', 1, 'delete_logentry'), ('Can view log entry', 1, 'view_logentry')",
	},
	{
		name:  "Commit4",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_4",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeAdmin2",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'admin'",
	},
	{
		name:  "SelectDjangoContentTypeForAuth",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'auth'",
	},
	{
		name:  "SetAutocommit0_5",
		query: "set autocommit=0",
	},
	{
		name:  "InsertDjangoContentTypeAuth",
		query: "INSERT INTO `django_content_type` (`app_label`, `model`) VALUES ('auth', 'permission'), ('auth', 'group')",
	},
	{
		name:  "Commit5",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_5",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeAuthPermission",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'auth' AND `django_content_type`.`model` = 'permission')",
	},
	{
		name:  "SelectDjangoContentTypeAuthGroup",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'auth' AND `django_content_type`.`model` = 'group')",
	},
	{
		name:  "SelectAuthPermissionForAuth",
		query: "SELECT `auth_permission`.`content_type_id`, `auth_permission`.`codename` FROM `auth_permission` INNER JOIN `django_content_type` ON (`auth_permission`.`content_type_id` = `django_content_type`.`id`) WHERE `auth_permission`.`content_type_id` IN (2, 3) ORDER BY `django_content_type`.`app_label` ASC, `django_content_type`.`model` ASC, `auth_permission`.`codename` ASC",
	},
	{
		name:  "SetAutocommit0_6",
		query: "set autocommit=0",
	},
	{
		name:  "InsertAuthPermissionForAuth",
		query: "INSERT INTO `auth_permission` (`name`, `content_type_id`, `codename`) VALUES ('Can add permission', 2, 'add_permission'), ('Can change permission', 2, 'change_permission'), ('Can delete permission', 2, 'delete_permission'), ('Can view permission', 2, 'view_permission'), ('Can add group', 3, 'add_group'), ('Can change group', 3, 'change_group'), ('Can delete group', 3, 'delete_group'), ('Can view group', 3, 'view_group')",
	},
	{
		name:  "Commit6",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_6",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeAuth3",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'auth'",
	},
	{
		name:  "SelectDjangoContentTypeForContenttypes",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'contenttypes'",
	},
	{
		name:  "SetAutocommit0_7",
		query: "set autocommit=0",
	},
	{
		name:  "InsertDjangoContentTypeContenttypes",
		query: "INSERT INTO `django_content_type` (`app_label`, `model`) VALUES ('contenttypes', 'contenttype')",
	},
	{
		name:  "Commit7",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_7",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeContenttypes",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'contenttypes' AND `django_content_type`.`model` = 'contenttype')",
	},
	{
		name:  "SelectAuthPermissionForContenttypes",
		query: "SELECT `auth_permission`.`content_type_id`, `auth_permission`.`codename` FROM `auth_permission` INNER JOIN `django_content_type` ON (`auth_permission`.`content_type_id` = `django_content_type`.`id`) WHERE `auth_permission`.`content_type_id` IN (4) ORDER BY `django_content_type`.`app_label` ASC, `django_content_type`.`model` ASC, `auth_permission`.`codename` ASC",
	},
	{
		name:  "SetAutocommit0_8",
		query: "set autocommit=0",
	},
	{
		name:  "InsertAuthPermissionForContenttypes",
		query: "INSERT INTO `auth_permission` (`name`, `content_type_id`, `codename`) VALUES ('Can add content type', 4, 'add_contenttype'), ('Can change content type', 4, 'change_contenttype'), ('Can delete content type', 4, 'delete_contenttype'), ('Can view content type', 4, 'view_contenttype')",
	},
	{
		name:  "Commit8",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_8",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeContenttypes2",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'contenttypes'",
	},
	{
		name:  "SelectDjangoContentTypeForSessions",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'sessions'",
	},
	{
		name:  "SetAutocommit0_9",
		query: "set autocommit=0",
	},
	{
		name:  "InsertDjangoContentTypeSessions",
		query: "INSERT INTO `django_content_type` (`app_label`, `model`) VALUES ('sessions', 'session')",
	},
	{
		name:  "Commit9",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_9",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeSessions",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'sessions' AND `django_content_type`.`model` = 'session')",
	},
	{
		name:  "SelectAuthPermissionForSessions",
		query: "SELECT `auth_permission`.`content_type_id`, `auth_permission`.`codename` FROM `auth_permission` INNER JOIN `django_content_type` ON (`auth_permission`.`content_type_id` = `django_content_type`.`id`) WHERE `auth_permission`.`content_type_id` IN (5) ORDER BY `django_content_type`.`app_label` ASC, `django_content_type`.`model` ASC, `auth_permission`.`codename` ASC",
	},
	{
		name:  "SetAutocommit0_10",
		query: "set autocommit=0",
	},
	{
		name:  "InsertAuthPermissionForSessions",
		query: "INSERT INTO `auth_permission` (`name`, `content_type_id`, `codename`) VALUES ('Can add session', 5, 'add_session'), ('Can change session', 5, 'change_session'), ('Can delete session', 5, 'delete_session'), ('Can view session', 5, 'view_session')",
	},
	{
		name:  "Commit10",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_10",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeSessions2",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'sessions'",
	},
	{
		name:  "SelectDjangoContentTypeForPost",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'post'",
	},
	{
		name:  "SetAutocommit0_11",
		query: "set autocommit=0",
	},
	{
		name:  "InsertDjangoContentTypePost",
		query: "INSERT INTO `django_content_type` (`app_label`, `model`) VALUES ('post', 'post')",
	},
	{
		name:  "Commit11",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_11",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypePost2",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'post' AND `django_content_type`.`model` = 'post')",
	},
	{
		name:  "SelectAuthPermissionForPost",
		query: "SELECT `auth_permission`.`content_type_id`, `auth_permission`.`codename` FROM `auth_permission` INNER JOIN `django_content_type` ON (`auth_permission`.`content_type_id` = `django_content_type`.`id`) WHERE `auth_permission`.`content_type_id` IN (6) ORDER BY `django_content_type`.`app_label` ASC, `django_content_type`.`model` ASC, `auth_permission`.`codename` ASC",
	},
	{
		name:  "SetAutocommit0_12",
		query: "set autocommit=0",
	},
	{
		name:  "InsertAuthPermissionForPost",
		query: "INSERT INTO `auth_permission` (`name`, `content_type_id`, `codename`) VALUES ('Can add post', 6, 'add_post'), ('Can change post', 6, 'change_post'), ('Can delete post', 6, 'delete_post'), ('Can view post', 6, 'view_post')",
	},
	{
		name:  "Commit12",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_12",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypePost3",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'post'",
	},
	{
		name:  "SelectDjangoContentTypeForAccounts",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'accounts'",
	},
	{
		name:  "SetAutocommit0_13",
		query: "set autocommit=0",
	},
	{
		name:  "InsertDjangoContentTypeAccounts",
		query: "INSERT INTO `django_content_type` (`app_label`, `model`) VALUES ('accounts', 'userprofile')",
	},
	{
		name:  "Commit13",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_13",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeAccounts2",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'accounts' AND `django_content_type`.`model` = 'userprofile')",
	},
	{
		name:  "SelectAuthPermissionForAccounts",
		query: "SELECT `auth_permission`.`content_type_id`, `auth_permission`.`codename` FROM `auth_permission` INNER JOIN `django_content_type` ON (`auth_permission`.`content_type_id` = `django_content_type`.`id`) WHERE `auth_permission`.`content_type_id` IN (7) ORDER BY `django_content_type`.`app_label` ASC, `django_content_type`.`model` ASC, `auth_permission`.`codename` ASC",
	},
	{
		name:  "SetAutocommit0_14",
		query: "set autocommit=0",
	},
	{
		name:  "InsertAuthPermissionForAccounts",
		query: "INSERT INTO `auth_permission` (`name`, `content_type_id`, `codename`) VALUES ('Can add user profile', 7, 'add_userprofile'), ('Can change user profile', 7, 'change_userprofile'), ('Can delete user profile', 7, 'delete_userprofile'), ('Can view user profile', 7, 'view_userprofile')",
	},
	{
		name:  "Commit14",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_14",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeAccounts3",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'accounts'",
	},
	{
		name:  "SelectDjangoContentTypeForComments",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'comments'",
	},
	{
		name:  "SetAutocommit0_15",
		query: "set autocommit=0",
	},
	{
		name:  "InsertDjangoContentTypeComments",
		query: "INSERT INTO `django_content_type` (`app_label`, `model`) VALUES ('comments', 'comment')",
	},
	{
		name:  "Commit15",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_15",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeComments2",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'comments' AND `django_content_type`.`model` = 'comment')",
	},
	{
		name:  "SelectAuthPermissionForComments",
		query: "SELECT `auth_permission`.`content_type_id`, `auth_permission`.`codename` FROM `auth_permission` INNER JOIN `django_content_type` ON (`auth_permission`.`content_type_id` = `django_content_type`.`id`) WHERE `auth_permission`.`content_type_id` IN (8) ORDER BY `django_content_type`.`app_label` ASC, `django_content_type`.`model` ASC, `auth_permission`.`codename` ASC",
	},
	{
		name:  "SetAutocommit0_16",
		query: "set autocommit=0",
	},
	{
		name:  "InsertAuthPermissionForComments",
		query: "INSERT INTO `auth_permission` (`name`, `content_type_id`, `codename`) VALUES ('Can add comment', 8, 'add_comment'), ('Can change comment', 8, 'change_comment'), ('Can delete comment', 8, 'delete_comment'), ('Can view comment', 8, 'view_comment')",
	},
	{
		name:  "Commit16",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_16",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeComments3",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'comments'",
	},
	{
		name:  "SelectDjangoContentTypeForLikesdislikes",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'likesdislikes'",
	},
	{
		name:  "SetAutocommit0_17",
		query: "set autocommit=0",
	},
	{
		name:  "InsertDjangoContentTypeLikesdislikes",
		query: "INSERT INTO `django_content_type` (`app_label`, `model`) VALUES ('likesdislikes', 'likedislike')",
	},
	{
		name:  "Commit17",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_17",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeLikesdislikes2",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'likesdislikes' AND `django_content_type`.`model` = 'likedislike')",
	},
	{
		name:  "SelectAuthPermissionForLikesdislikes",
		query: "SELECT `auth_permission`.`content_type_id`, `auth_permission`.`codename` FROM `auth_permission` INNER JOIN `django_content_type` ON (`auth_permission`.`content_type_id` = `django_content_type`.`id`) WHERE `auth_permission`.`content_type_id` IN (9) ORDER BY `django_content_type`.`app_label` ASC, `django_content_type`.`model` ASC, `auth_permission`.`codename` ASC",
	},
	{
		name:  "SetAutocommit0_18",
		query: "set autocommit=0",
	},
	{
		name:  "InsertAuthPermissionForLikesdislikes",
		query: "INSERT INTO `auth_permission` (`name`, `content_type_id`, `codename`) VALUES ('Can add like dislike', 9, 'add_likedislike'), ('Can change like dislike', 9, 'change_likedislike'), ('Can delete like dislike', 9, 'delete_likedislike'), ('Can view like dislike', 9, 'view_likedislike')",
	},
	{
		name:  "Commit18",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_18",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeLikesdislikes3",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'likesdislikes'",
	},
	{
		name:  "SelectDjangoContentTypeForBookmarks",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'bookmarks'",
	},
	{
		name:  "SetAutocommit0_19",
		query: "set autocommit=0",
	},
	{
		name:  "InsertDjangoContentTypeBookmarks",
		query: "INSERT INTO `django_content_type` (`app_label`, `model`) VALUES ('bookmarks', 'bookmarkpost')",
	},
	{
		name:  "Commit19",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_19",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeBookmarks2",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE (`django_content_type`.`app_label` = 'bookmarks' AND `django_content_type`.`model` = 'bookmarkpost')",
	},
	{
		name:  "SelectAuthPermissionForBookmarks",
		query: "SELECT `auth_permission`.`content_type_id`, `auth_permission`.`codename` FROM `auth_permission` INNER JOIN `django_content_type` ON (`auth_permission`.`content_type_id` = `django_content_type`.`id`) WHERE `auth_permission`.`content_type_id` IN (10) ORDER BY `django_content_type`.`app_label` ASC, `django_content_type`.`model` ASC, `auth_permission`.`codename` ASC",
	},
	{
		name:  "SetAutocommit0_20",
		query: "set autocommit=0",
	},
	{
		name:  "InsertAuthPermissionForBookmarks",
		query: "INSERT INTO `auth_permission` (`name`, `content_type_id`, `codename`) VALUES ('Can add bookmark post', 10, 'add_bookmarkpost'), ('Can change bookmark post', 10, 'change_bookmarkpost'), ('Can delete bookmark post', 10, 'delete_bookmarkpost'), ('Can view bookmark post', 10, 'view_bookmarkpost')",
	},
	{
		name:  "Commit20",
		query: "commit",
	},
	{
		name:  "SetAutocommit1_20",
		query: "set autocommit=1",
	},
	{
		name:  "SelectDjangoContentTypeBookmarks3",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'bookmarks'",
	},
	{
		name:  "SelectDjangoContentTypeForPagedown",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'pagedown'",
	},
	{
		name:  "SelectDjangoContentTypeForPagedown2",
		query: "SELECT `django_content_type`.`id`, `django_content_type`.`app_label`, `django_content_type`.`model` FROM `django_content_type` WHERE `django_content_type`.`app_label` = 'pagedown'",
	},
}

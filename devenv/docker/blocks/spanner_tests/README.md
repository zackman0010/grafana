This devenv block spawns a Spanner emulator for Grafana integration tests and development purposes:

```
make devenv sources=spanner_tests
```

You should then be able to connect to the database using Go SQL Spanner driver. Here's a minimal example:

```go
package main

import (
	"log"

	_ "github.com/googleapis/go-sql-spanner"

	"context"
	"database/sql"
	"fmt"
)

func main() {
	ctx := context.Background()
	db, err := sql.Open("spanner", fmt.Sprintf("projects/%s/instances/%s/databases/%s", "grafanatest", "grafanatest", "grafanatest"))
	if err != nil {
		log.Fatalf("failed to open database connection: %v", err)
	}
	defer db.Close()

	rows, err := db.QueryContext(ctx, "SELECT 'Hello World!'")
	if err != nil {
		log.Fatalf("failed to execute query: %v", err)
	}
	defer rows.Close()

	var msg string
	for rows.Next() {
		if err := rows.Scan(&msg); err != nil {
			log.Fatalf("failed to scan row values: %v", err)
		}
		fmt.Printf("%s\n", msg)
	}
	if err := rows.Err(); err != nil {
		log.Fatalf("failed to execute query: %v", err)
	}
}
```

Run it and you should see the "Hello world" message:

```
SPANNER_EMULATOR_HOST=localhost:9010 go run example.go
```

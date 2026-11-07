// Package migrations holds the versioned schema changes. Each file registers
// itself in init(); create new ones with: go run . make:migration create_x_table
//
// Migrations define their own snapshot structs instead of using app/models, so
// later model changes never alter what an old migration does.
package migrations

import "go-mvc/database"

var registry []database.Migration

func register(m database.Migration) { registry = append(registry, m) }

// All returns every registered migration.
func All() []database.Migration { return registry }

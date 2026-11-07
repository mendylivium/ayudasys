// Package seeders fills the database with initial/demo data (go run . db:seed).
package seeders

import (
	"fmt"

	"gorm.io/gorm"
)

// Seeder populates part of the database.
type Seeder interface {
	Name() string
	Run(db *gorm.DB) error
}

// DatabaseSeeder lists the seeders run by db:seed, in order.
var DatabaseSeeder = []Seeder{
	UserSeeder{},
}

// Run executes every seeder in DatabaseSeeder.
func Run(db *gorm.DB, log func(string)) error {
	for _, s := range DatabaseSeeder {
		if err := db.Transaction(s.Run); err != nil {
			return fmt.Errorf("%s: %w", s.Name(), err)
		}
		log(s.Name())
	}
	return nil
}

package migrations

import (
	"time"

	"gorm.io/gorm"

	"go-mvc/database"
)

func init() {
	type user struct {
		ID        uint   `gorm:"primaryKey"`
		Name      string `gorm:"size:100;not null"`
		Email     string `gorm:"size:100;uniqueIndex;not null"`
		Password  string `gorm:"size:255;not null"`
		Role      string `gorm:"size:20;not null;default:user"`
		CreatedAt time.Time
		UpdatedAt time.Time
		DeletedAt gorm.DeletedAt `gorm:"index"`
	}

	register(database.Migration{
		Name: "2026_09_25_000001_create_users_table",
		Up: func(tx *gorm.DB) error {
			return tx.Table("users").Migrator().CreateTable(&user{})
		},
		Down: func(tx *gorm.DB) error {
			return tx.Migrator().DropTable("users")
		},
	})
}

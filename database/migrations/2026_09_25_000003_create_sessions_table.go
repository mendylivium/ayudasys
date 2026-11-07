package migrations

import (
	"gorm.io/gorm"

	"go-mvc/database"
)

func init() {
	// Backing table for SESSION_DRIVER=database (see pkg/gormstore).
	type session struct {
		ID        string `gorm:"primaryKey;size:128"`
		Data      []byte `gorm:"not null"`
		ExpiresAt int64  `gorm:"not null;index"`
	}

	register(database.Migration{
		Name: "2026_09_25_000003_create_sessions_table",
		Up: func(tx *gorm.DB) error {
			return tx.Table("sessions").Migrator().CreateTable(&session{})
		},
		Down: func(tx *gorm.DB) error {
			return tx.Migrator().DropTable("sessions")
		},
	})
}

package migrations

import (
	"go-mvc/app/models"
	"go-mvc/database"
	"gorm.io/gorm"
)

func init() {
	register(database.Migration{
		Name: "2026_11_06_000004_create_ayuda_tables",
		Up: func(tx *gorm.DB) error {
			return tx.AutoMigrate(&models.Household{}, &models.Member{}, &models.Program{}, &models.Enrollment{}, &models.Claim{})
		},
		Down: func(tx *gorm.DB) error {
			return tx.Migrator().DropTable(&models.Claim{}, &models.Enrollment{}, &models.Member{}, &models.Program{}, &models.Household{})
		},
	})
}

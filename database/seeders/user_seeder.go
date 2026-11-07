package seeders

import (
	"fmt"
	"go-mvc/app/models"
	"gorm.io/gorm"
	"os"
)

type UserSeeder struct{}

func (UserSeeder) Name() string { return "UserSeeder" }
func (UserSeeder) Run(db *gorm.DB) error {
	password := os.Getenv("SEED_PASSWORD")
	if password == "" {
		if os.Getenv("APP_ENV") == "production" {
			return fmt.Errorf("set SEED_PASSWORD (12+ characters) before seeding production staff")
		}
		password = "password"
	} else if len(password) < 12 || len(password) > 72 {
		return fmt.Errorf("SEED_PASSWORD must be between 12 and 72 characters")
	}
	users := []models.User{
		{Name: "Administrator", Email: "admin@example.com", Role: models.RoleAdmin},
		{Name: "Census Officer", Email: "enumerator@example.com", Role: models.RoleEnumerator},
		{Name: "Distribution Officer", Email: "distributor@example.com", Role: models.RoleDistributor},
	}
	for _, u := range users {
		if err := u.HashPassword(password); err != nil {
			return err
		}
		if err := db.Where(models.User{Email: u.Email}).FirstOrCreate(&u).Error; err != nil {
			return err
		}
	}
	return nil
}

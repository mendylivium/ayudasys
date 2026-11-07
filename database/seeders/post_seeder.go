package seeders

import (
	"fmt"

	"gorm.io/gorm"

	"go-mvc/app/models"
)

type PostSeeder struct{}

func (PostSeeder) Name() string { return "PostSeeder" }

// Run gives each seeded user a few sample posts (skipped if they already have some).
func (PostSeeder) Run(db *gorm.DB) error {
	var users []models.User
	if err := db.Where("email IN ?", []string{"admin@example.com", "user@example.com"}).Find(&users).Error; err != nil {
		return err
	}
	for _, u := range users {
		var count int64
		db.Model(&models.Post{}).Where("user_id = ?", u.ID).Count(&count)
		if count > 0 {
			continue
		}
		for i := 1; i <= 4; i++ {
			post := models.Post{
				Title:     fmt.Sprintf("%s's post #%d", u.Name, i),
				Body:      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
				Published: i != 4, // last one stays a draft
				UserID:    u.ID,
			}
			if err := db.Create(&post).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

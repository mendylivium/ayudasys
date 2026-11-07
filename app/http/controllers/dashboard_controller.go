package controllers

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	"go-mvc/app/models"
	"go-mvc/pkg/inertia"
)

type DashboardController struct {
	db *gorm.DB
}

func NewDashboardController(db *gorm.DB) *DashboardController {
	return &DashboardController{db: db}
}

// GET /dashboard
func (d *DashboardController) Index(c fiber.Ctx) error {
	user := auth.User(c)

	var myPosts, myPublished, users int64
	mine := d.db.Model(&models.Post{}).Where("user_id = ?", user.ID)
	if err := mine.Session(&gorm.Session{}).Count(&myPosts).Error; err != nil {
		return err
	}
	if err := mine.Session(&gorm.Session{}).Scopes(models.Published).Count(&myPublished).Error; err != nil {
		return err
	}
	if user.IsAdmin() {
		if err := d.db.Model(&models.User{}).Count(&users).Error; err != nil {
			return err
		}
	}

	var recent []models.Post
	if err := d.db.Where("user_id = ?", user.ID).Order("updated_at DESC").Limit(5).Find(&recent).Error; err != nil {
		return err
	}

	return inertia.Render(c, "Dashboard", fiber.Map{
		"stats": fiber.Map{
			"posts":     myPosts,
			"published": myPublished,
			"drafts":    myPosts - myPublished,
			"users":     users,
		},
		"recentPosts": recent,
	})
}

package controllers

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/models"
	"go-mvc/pkg/inertia"
)

type HomeController struct {
	db *gorm.DB
}

func NewHomeController(db *gorm.DB) *HomeController {
	return &HomeController{db: db}
}

// GET /
func (h *HomeController) Welcome(c fiber.Ctx) error {
	var posts []models.Post
	if err := h.db.Scopes(models.Published, models.WithAuthor).
		Order("created_at DESC").Limit(6).Find(&posts).Error; err != nil {
		return err
	}
	return inertia.Render(c, "Welcome", fiber.Map{"posts": posts})
}

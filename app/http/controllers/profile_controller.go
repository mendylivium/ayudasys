package controllers

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	"go-mvc/app/http/requests"
	"go-mvc/app/models"
	"go-mvc/pkg/inertia"
	"go-mvc/pkg/session"
)

type ProfileController struct {
	db *gorm.DB
}

func NewProfileController(db *gorm.DB) *ProfileController {
	return &ProfileController{db: db}
}

// GET /profile
func (p *ProfileController) Edit(c fiber.Ctx) error {
	return inertia.Render(c, "Profile/Edit", nil)
}

// PUT /profile
func (p *ProfileController) Update(c fiber.Ctx) error {
	var req requests.UpdateProfileRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}

	user := auth.User(c)
	var taken int64
	if err := p.db.Model(&models.User{}).
		Where("email = ? AND id <> ?", req.Email, user.ID).Count(&taken).Error; err != nil {
		return err
	}
	if taken > 0 {
		session.FlashErrors(c, map[string]string{"email": "The email has already been taken."})
		return c.Redirect().Back("/profile")
	}

	user.Name, user.Email = req.Name, req.Email
	if err := p.db.Save(user).Error; err != nil {
		return err
	}
	return back(c, "success", "Profile updated.")
}

// PUT /profile/password
func (p *ProfileController) UpdatePassword(c fiber.Ctx) error {
	var req requests.UpdatePasswordRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}

	user := auth.User(c)
	if !user.CheckPassword(req.CurrentPassword) {
		session.FlashErrors(c, map[string]string{"current_password": "The current password is incorrect."})
		return c.Redirect().Back("/profile")
	}
	if err := user.HashPassword(req.Password); err != nil {
		return err
	}
	if err := p.db.Save(user).Error; err != nil {
		return err
	}
	return back(c, "success", "Password updated.")
}

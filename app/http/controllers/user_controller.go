package controllers

import (
	"errors"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	"go-mvc/app/models"
	"go-mvc/app/policies"
	"go-mvc/pkg/inertia"
	"go-mvc/pkg/pagination"
)

// UserController is the admin user management screen.
type UserController struct {
	db *gorm.DB
}

func NewUserController(db *gorm.DB) *UserController {
	return &UserController{db: db}
}

// GET /users
func (u *UserController) Index(c fiber.Ctx) error {
	q := u.db.Model(&models.User{}).Order("created_at DESC")
	if s := c.Query("search"); s != "" {
		like := "%" + s + "%"
		q = q.Where("name LIKE ? OR email LIKE ?", like, like)
	}
	users, err := pagination.Paginate[models.User](c, q, 15)
	if err != nil {
		return err
	}
	return inertia.Render(c, "Users/Index", fiber.Map{
		"users":   users,
		"filters": fiber.Map{"search": c.Query("search")},
	})
}

// DELETE /users/:id
func (u *UserController) Destroy(c fiber.Ctx) error {
	id, err := paramID(c)
	if err != nil {
		return err
	}
	var target models.User
	if err := u.db.First(&target, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fiber.ErrNotFound
		}
		return err
	}
	if !policies.DeleteUser(auth.User(c), &target) {
		return back(c, "error", "You cannot delete this user.")
	}
	if err := u.db.Delete(&target).Error; err != nil {
		return err
	}
	return back(c, "success", "User deleted.")
}

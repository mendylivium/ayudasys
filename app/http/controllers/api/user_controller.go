package api

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	"go-mvc/app/http/requests"
	"go-mvc/app/models"
	"go-mvc/app/policies"
	"go-mvc/pkg/response"
)

type UserController struct {
	db *gorm.DB
}

func NewUserController(db *gorm.DB) *UserController {
	return &UserController{db: db}
}

// GET /api/users (admin)
func (u *UserController) Index(c fiber.Ctx) error {
	var users []models.User
	if err := u.db.Find(&users).Error; err != nil {
		return response.InternalError(c, "Failed to load users")
	}
	return response.OK(c, "Users retrieved", users)
}

// GET /api/users/:id (drafts are only included for yourself or an admin)
func (u *UserController) Show(c fiber.Ctx) error {
	user, ok := u.find(c)
	if !ok {
		return response.NotFound(c, "User not found")
	}
	posts := u.db.Where("user_id = ?", user.ID).Order("created_at DESC")
	if !policies.UpdateUser(auth.User(c), user) {
		posts = posts.Scopes(models.Published)
	}
	if err := posts.Find(&user.Posts).Error; err != nil {
		return response.InternalError(c, "Failed to load posts")
	}
	return response.OK(c, "User retrieved", user)
}

// PUT /api/users/:id
func (u *UserController) Update(c fiber.Ctx) error {
	user, ok := u.find(c)
	if !ok {
		return response.NotFound(c, "User not found")
	}
	if !policies.UpdateUser(auth.User(c), user) {
		return response.Forbidden(c, "You cannot update another user's profile")
	}

	var req requests.UpdateUserRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}
	if req.Name != "" {
		user.Name = req.Name
	}
	if err := u.db.Save(user).Error; err != nil {
		return response.InternalError(c, "Failed to update user")
	}
	return response.OK(c, "User updated", user)
}

// DELETE /api/users/:id (admin)
func (u *UserController) Destroy(c fiber.Ctx) error {
	user, ok := u.find(c)
	if !ok {
		return response.NotFound(c, "User not found")
	}
	if !policies.DeleteUser(auth.User(c), user) {
		return response.Forbidden(c, "You cannot delete this user")
	}
	if err := u.db.Delete(user).Error; err != nil {
		return response.InternalError(c, "Failed to delete user")
	}
	return response.OK(c, "User deleted", nil)
}

func (u *UserController) find(c fiber.Ctx) (*models.User, bool) {
	id, ok := paramID(c)
	if !ok {
		return nil, false
	}
	var user models.User
	if err := u.db.First(&user, id).Error; err != nil {
		return nil, false
	}
	return &user, true
}

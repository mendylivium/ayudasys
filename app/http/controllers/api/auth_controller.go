package api

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	"go-mvc/app/http/requests"
	"go-mvc/app/models"
	"go-mvc/pkg/response"
)

type AuthController struct {
	db  *gorm.DB
	jwt *auth.JWT
}

func NewAuthController(db *gorm.DB, jwt *auth.JWT) *AuthController {
	return &AuthController{db: db, jwt: jwt}
}

// POST /api/auth/register
func (a *AuthController) Register(c fiber.Ctx) error {
	var req requests.RegisterRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}

	var count int64
	a.db.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		return response.ValidationFailed(c, map[string]string{"email": "The email has already been taken."})
	}

	user := models.User{Name: req.Name, Email: req.Email, Role: models.RoleUser}
	if err := user.HashPassword(req.Password); err != nil {
		return response.InternalError(c, "Failed to hash password")
	}
	if err := a.db.Create(&user).Error; err != nil {
		return response.InternalError(c, "Failed to create user")
	}

	token, err := a.jwt.Issue(user.ID, user.Email, user.Role)
	if err != nil {
		return response.InternalError(c, "Failed to generate token")
	}
	return response.Created(c, "User registered successfully", fiber.Map{"user": user, "token": token})
}

// POST /api/auth/login
func (a *AuthController) Login(c fiber.Ctx) error {
	var req requests.LoginRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}

	var user models.User
	if err := a.db.Where("email = ?", req.Email).First(&user).Error; err != nil || !user.CheckPassword(req.Password) {
		return response.Unauthorized(c, "Invalid email or password")
	}

	token, err := a.jwt.Issue(user.ID, user.Email, user.Role)
	if err != nil {
		return response.InternalError(c, "Failed to generate token")
	}
	return response.OK(c, "Login successful", fiber.Map{"user": user, "token": token})
}

// GET /api/auth/me
func (a *AuthController) Me(c fiber.Ctx) error {
	return response.OK(c, "Current user", auth.User(c))
}

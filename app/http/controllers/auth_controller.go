package controllers

import (
	"errors"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	"go-mvc/app/http/requests"
	"go-mvc/app/models"
	"go-mvc/pkg/inertia"
	"go-mvc/pkg/session"
)

type AuthController struct {
	db *gorm.DB
}

func NewAuthController(db *gorm.DB) *AuthController {
	return &AuthController{db: db}
}

// GET /login
func (a *AuthController) ShowLogin(c fiber.Ctx) error {
	return inertia.Render(c, "Auth/Login", nil)
}

// POST /login
func (a *AuthController) Login(c fiber.Ctx) error {
	var req requests.LoginRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}

	var user models.User
	err := a.db.Where("email = ?", req.Email).First(&user).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	if err != nil || !user.CheckPassword(req.Password) {
		session.FlashErrors(c, map[string]string{"email": "These credentials do not match our records."})
		return c.Redirect().Back("/login")
	}

	if err := auth.Login(c, &user); err != nil {
		return err
	}
	return redirect(c, auth.Intended(c, "/dashboard"), "success", "Welcome back, "+user.Name+"!")
}

// GET /register
func (a *AuthController) ShowRegister(c fiber.Ctx) error {
	return inertia.Render(c, "Auth/Register", nil)
}

// POST /register
func (a *AuthController) Register(c fiber.Ctx) error {
	var req requests.WebRegisterRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}

	var count int64
	if err := a.db.Model(&models.User{}).Where("email = ?", req.Email).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		session.FlashErrors(c, map[string]string{"email": "The email has already been taken."})
		return c.Redirect().Back("/register")
	}

	user := models.User{Name: req.Name, Email: req.Email, Role: models.RoleUser}
	if err := user.HashPassword(req.Password); err != nil {
		return err
	}
	if err := a.db.Create(&user).Error; err != nil {
		return err
	}

	if err := auth.Login(c, &user); err != nil {
		return err
	}
	return redirect(c, "/dashboard", "success", "Your account has been created.")
}

// POST /logout
func (a *AuthController) Logout(c fiber.Ctx) error {
	if err := auth.Logout(c); err != nil {
		return err
	}
	return c.Redirect().To("/")
}

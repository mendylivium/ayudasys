package middleware

import (
	"slices"
	"strings"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	"go-mvc/app/models"
	"go-mvc/pkg/response"
)

// LoadSessionUser resolves the logged-in user from the session (web guard).
func LoadSessionUser(db *gorm.DB) fiber.Handler {
	return func(c fiber.Ctx) error {
		if u := auth.UserFromSession(c, db); u != nil {
			auth.SetUser(c, u)
		}
		return c.Next()
	}
}

// Authenticate redirects guests to the login page (web guard).
func Authenticate() fiber.Handler {
	return func(c fiber.Ctx) error {
		if !auth.Check(c) {
			auth.RememberIntended(c)
			return c.Redirect().To("/login")
		}
		return c.Next()
	}
}

// Guest redirects authenticated users away from login/register pages.
func Guest() fiber.Handler {
	return func(c fiber.Ctx) error {
		if auth.Check(c) {
			return c.Redirect().To("/dashboard")
		}
		return c.Next()
	}
}

// RequireRole allows only users with one of the given roles (both guards).
func RequireRole(roles ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		u := auth.User(c)
		if u == nil {
			return fiber.ErrUnauthorized
		}
		if !slices.Contains(roles, u.Role) {
			return fiber.NewError(fiber.StatusForbidden, "You don't have permission to access this resource.")
		}
		return c.Next()
	}
}

// JWTAuth requires a valid "Authorization: Bearer <token>" header (api guard).
func JWTAuth(db *gorm.DB, jwt *auth.JWT) fiber.Handler {
	return func(c fiber.Ctx) error {
		header := c.Get(fiber.HeaderAuthorization)
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			return response.Unauthorized(c, "Missing or invalid authorization header")
		}

		claims, err := jwt.Parse(token)
		if err != nil {
			return response.Unauthorized(c, "Invalid or expired token")
		}

		var u models.User
		if err := db.First(&u, claims.UserID).Error; err != nil {
			return response.Unauthorized(c, "User no longer exists")
		}
		auth.SetUser(c, &u)
		return c.Next()
	}
}

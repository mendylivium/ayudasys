// Package auth resolves the current user for both guards:
//   - "web": session cookie (Inertia pages)
//   - "api": JWT bearer token
package auth

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/models"
	"go-mvc/pkg/session"
)

const (
	userKey        = "auth.user"
	sessionUserKey = "auth.user_id"
	intendedKey    = "url.intended"
)

// User returns the authenticated user, or nil for guests.
func User(c fiber.Ctx) *models.User {
	u, _ := c.Locals(userKey).(*models.User)
	return u
}

// SetUser stores the authenticated user on the request.
func SetUser(c fiber.Ctx, u *models.User) {
	c.Locals(userKey, u)
}

// Check reports whether the request is authenticated.
func Check(c fiber.Ctx) bool { return User(c) != nil }

// Login starts a session for u (web guard).
func Login(c fiber.Ctx, u *models.User) error {
	if err := session.Regenerate(c); err != nil {
		return err
	}
	session.Put(c, sessionUserKey, u.ID)
	SetUser(c, u)
	return nil
}

// Logout ends the session (web guard).
func Logout(c fiber.Ctx) error {
	SetUser(c, nil)
	return session.Invalidate(c)
}

// UserFromSession loads the user whose ID is stored in the session.
func UserFromSession(c fiber.Ctx, db *gorm.DB) *models.User {
	id, ok := session.Get(c, sessionUserKey).(uint)
	if !ok || id == 0 {
		return nil
	}
	var u models.User
	if err := db.First(&u, id).Error; err != nil {
		session.Forget(c, sessionUserKey)
		return nil
	}
	return &u
}

// RememberIntended saves the URL a guest tried to open before logging in.
func RememberIntended(c fiber.Ctx) {
	if c.Method() == fiber.MethodGet {
		session.Put(c, intendedKey, c.OriginalURL())
	}
}

// Intended returns (and clears) the remembered URL, or fallback.
func Intended(c fiber.Ctx, fallback string) string {
	if url := session.Pull(c, intendedKey); url != "" {
		return url
	}
	return fallback
}

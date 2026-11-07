package middleware

import (
	"github.com/gofiber/fiber/v3"

	"go-mvc/app/auth"
	"go-mvc/config"
	"go-mvc/pkg/inertia"
	"go-mvc/pkg/session"
)

// HandleInertiaRequests defines the props shared by every page, like
// Laravel's HandleInertiaRequests::share().
func HandleInertiaRequests(cfg *config.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		inertia.Share(c, "appName", cfg.App.Name)
		inertia.Share(c, "auth", func() any {
			return fiber.Map{"user": auth.User(c)}
		})
		inertia.Share(c, "flash", func() any {
			return session.PullFlash(c)
		})
		inertia.Share(c, "errors", inertia.Always(func() any {
			return session.PullErrors(c)
		}))
		return c.Next()
	}
}

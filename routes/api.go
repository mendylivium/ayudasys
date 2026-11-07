package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"go-mvc/app/auth"
	"go-mvc/app/http/controllers/api"
	mw "go-mvc/app/http/middleware"
	"gorm.io/gorm"
	"time"
)

// AyudaSys staff accounts are provisioned by administrators, never by public signup.
func API(r fiber.Router, db *gorm.DB, jwt *auth.JWT) {
	authc := api.NewAuthController(db, jwt)
	r.Get("/health", func(c fiber.Ctx) error { return c.JSON(fiber.Map{"status": "ok"}) })
	r.Post("/auth/login", limiter.New(limiter.Config{Max: 10, Expiration: time.Minute}), authc.Login)
	r.Get("/auth/me", mw.JWTAuth(db, jwt), authc.Me)
}

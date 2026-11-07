// Package bootstrap wires configuration, database and HTTP kernel together,
// like Laravel's bootstrap/app.php.
package bootstrap

import (
	"errors"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/extractors"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/csrf"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	fsession "github.com/gofiber/fiber/v3/middleware/session"
	"github.com/gofiber/fiber/v3/middleware/static"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	mw "go-mvc/app/http/middleware"
	"go-mvc/config"
	"go-mvc/database"
	"go-mvc/pkg/gormstore"
	"go-mvc/pkg/inertia"
	"go-mvc/pkg/response"
	"go-mvc/pkg/vite"
	"go-mvc/resources/views"
	"go-mvc/routes"
)

// App is the application container.
type App struct {
	Config *config.Config
	DB     *gorm.DB
	HTTP   *fiber.App

	closers []func() error
}

// Load reads the configuration and opens the database connection.
func Load() (*App, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	db, err := database.Connect(cfg.Database)
	if err != nil {
		return nil, err
	}
	a := &App{Config: cfg, DB: db}
	a.closers = append(a.closers, func() error {
		sqlDB, err := db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	})
	return a, nil
}

// Close releases resources (session GC, database connection).
func (a *App) Close() {
	for i := len(a.closers) - 1; i >= 0; i-- {
		if err := a.closers[i](); err != nil {
			log.Printf("shutdown: %v", err)
		}
	}
}

// BuildHTTP creates the Fiber app with global middleware and all routes.
func (a *App) BuildHTTP() *fiber.App {
	cfg := a.Config

	v := vite.New(cfg.Vite.DistPath, cfg.Vite.HotFile, !cfg.App.IsProduction(), cfg.App.IsProduction())
	in := inertia.New(inertia.Config{
		Template: views.App,
		Version:  v.Version,
		ViewData: func(c fiber.Ctx) (map[string]any, error) {
			tags, err := v.Tags(cfg.Vite.Entry)
			return map[string]any{"vite": tags, "appName": cfg.App.Name}, err
		},
	})

	app := fiber.New(fiber.Config{
		AppName:      cfg.App.Name,
		ErrorHandler: errorHandler(cfg),
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format:     "[${time}] ${status} - ${latency} ${method} ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
		TimeZone:   cfg.App.Timezone,
	}))

	// Frontend build output (dist/) and public/ are served as plain folders.
	app.Use("/assets", static.New(cfg.Vite.DistPath+"/assets", static.Config{MaxAge: 31536000}))
	app.Use(static.New(cfg.Vite.DistPath, static.Config{
		Next: func(c fiber.Ctx) bool { return strings.HasPrefix(c.Path(), "/.vite") },
	}))
	app.Use(static.New(cfg.Vite.PublicPath))

	// Maintenance mode (./forge down): every request gets a 503.
	app.Use(func(c fiber.Ctx) error {
		if _, err := os.Stat(cfg.App.MaintenanceFile); err == nil {
			c.Set(fiber.HeaderRetryAfter, "60")
			return fiber.ErrServiceUnavailable
		}
		return c.Next()
	})

	// JSON API: stateless, JWT auth, no session/CSRF.
	jwt := auth.NewJWT(cfg.Auth.JWTSecret, cfg.Auth.JWTExpires)
	apiGroup := app.Group("/api", cors.New(cors.Config{
		AllowOrigins: cfg.CORS.AllowedOrigins,
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Content-Type", "Authorization"},
	}))
	routes.API(apiGroup, a.DB, jwt)

	// Web: session + CSRF + Inertia.
	sessionHandler, sessionStore := fsession.NewWithStore(fsession.Config{
		Storage:        a.sessionStorage(),
		Extractor:      extractors.FromCookie(cfg.Session.Cookie),
		IdleTimeout:    cfg.Session.Lifetime,
		CookieHTTPOnly: true,
		CookieSecure:   cfg.Session.Secure,
		CookieSameSite: "Lax",
		Next:           isAPI,
	})
	app.Use(sessionHandler)
	app.Use(csrf.New(csrf.Config{
		Session:        sessionStore,
		CookieName:     "XSRF-TOKEN",                          // read by the Inertia client...
		Extractor:      extractors.FromHeader("X-XSRF-TOKEN"), // ...and sent back in this header
		CookieHTTPOnly: false,
		CookieSecure:   cfg.Session.Secure,
		CookieSameSite: "Lax",
		IdleTimeout:    cfg.Session.Lifetime,
		ErrorHandler: func(fiber.Ctx, error) error {
			return fiber.NewError(419, "Page Expired")
		},
		Next: isAPI,
	}))
	app.Use(mw.LoadSessionUser(a.DB))
	app.Use(mw.HandleInertiaRequests(cfg))
	app.Use(in.Middleware())

	routes.Web(app, a.DB)

	app.Use(func(fiber.Ctx) error { return fiber.ErrNotFound })

	a.HTTP = app
	return app
}

func (a *App) sessionStorage() fiber.Storage {
	if a.Config.Session.Driver != "database" {
		return nil // in-memory
	}
	store := gormstore.New(a.DB, 10*time.Minute)
	a.closers = append(a.closers, store.Close)
	return store
}

func isAPI(c fiber.Ctx) bool {
	return c.Path() == "/api" || strings.HasPrefix(c.Path(), "/api/")
}

// errorHandler renders JSON for /api and an Inertia "Error" page for the web.
func errorHandler(cfg *config.Config) fiber.ErrorHandler {
	return func(c fiber.Ctx, err error) error {
		code := fiber.StatusInternalServerError
		message := err.Error()
		var fe *fiber.Error
		if errors.As(err, &fe) {
			code, message = fe.Code, fe.Message
		}
		if code >= 500 {
			log.Printf("[error] %s %s: %v", c.Method(), c.OriginalURL(), err)
			if cfg.App.IsProduction() {
				message = "Server Error"
			}
		}

		if isAPI(c) {
			return response.Error(c, code, message)
		}

		c.Status(code)
		if rerr := inertia.Render(c, "Error", fiber.Map{"status": code, "message": message}); rerr != nil {
			log.Printf("[error] rendering error page: %v", rerr)
			return c.Status(code).SendString(message)
		}
		return nil
	}
}

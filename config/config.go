// Package config loads application settings from the environment (.env),
// grouped the same way Laravel splits its config/ files.
package config

import (
	"errors"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App      App
	Database Database
	Auth     Auth
	Session  Session
	Vite     Vite
	CORS     CORS
}

type App struct {
	Name     string
	Env      string // development | production | testing
	Port     string
	Timezone string
	// MaintenanceFile exists while the app is down (./forge down / up).
	MaintenanceFile string
}

func (a App) IsProduction() bool { return a.Env == "production" }

type Database struct {
	Driver   string // sqlite | mysql | postgres
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
	File     string // SQLite only
	Timezone string
	Debug    bool // log every SQL query
}

type Auth struct {
	JWTSecret  string
	JWTExpires time.Duration
}

type Session struct {
	Driver   string // database | memory
	Cookie   string
	Lifetime time.Duration
	Secure   bool
}

type Vite struct {
	DistPath   string // Vite build output served as static files
	PublicPath string // static files used while the Vite dev server runs
	HotFile    string // written by the Vite dev server, holds its URL
	Entry      string
}

type CORS struct {
	AllowedOrigins []string
}

// Load reads .env (if present) and the process environment.
func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}

	env := get("APP_ENV", "development")
	driver := get("DB_DRIVER", "sqlite")
	tz := get("APP_TIMEZONE", "Asia/Manila")

	cfg := &Config{
		App: App{
			Name:     get("APP_NAME", "AyudaSys"),
			Env:      env,
			Port:     get("APP_PORT", "3000"),
			Timezone: tz,

			MaintenanceFile: "./storage/down",
		},
		Database: Database{
			Driver:   driver,
			Host:     get("DB_HOST", "127.0.0.1"),
			Port:     get("DB_PORT", defaultDBPort(driver)),
			User:     get("DB_USER", ""),
			Password: get("DB_PASSWORD", ""),
			Name:     get("DB_NAME", "go_mvc"),
			SSLMode:  get("DB_SSLMODE", "disable"),
			File:     get("DB_FILE", "./storage/database.db"),
			Timezone: tz,
			Debug:    getBool("DB_DEBUG", false),
		},
		Auth: Auth{
			JWTSecret:  get("JWT_SECRET", ""),
			JWTExpires: getDuration("JWT_EXPIRES_IN", 24*time.Hour),
		},
		Session: Session{
			Driver:   get("SESSION_DRIVER", "database"),
			Cookie:   get("SESSION_COOKIE", "gomvc_session"),
			Lifetime: getDuration("SESSION_LIFETIME", 2*time.Hour),
			Secure:   getBool("SESSION_SECURE_COOKIE", env == "production"),
		},
		Vite: Vite{
			DistPath:   get("VITE_DIST_PATH", "./dist"),
			PublicPath: "./public",
			HotFile:    "./storage/vite.hot",
			Entry:      "resources/js/app.js",
		},
		CORS: CORS{
			AllowedOrigins: splitList(get("CORS_ALLOWED_ORIGINS", "*")),
		},
	}

	if cfg.Auth.JWTSecret == "" {
		if cfg.App.IsProduction() {
			return nil, errors.New("JWT_SECRET must be set in production (run: go run . key:generate)")
		}
		log.Println("[config] JWT_SECRET is empty, using an insecure development secret")
		cfg.Auth.JWTSecret = "insecure-development-secret"
	}

	return cfg, nil
}

func defaultDBPort(driver string) string {
	switch driver {
	case "mysql":
		return "3306"
	case "postgres":
		return "5432"
	}
	return ""
}

func get(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getBool(key string, fallback bool) bool {
	if b, err := strconv.ParseBool(get(key, "")); err == nil {
		return b
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if d, err := time.ParseDuration(get(key, "")); err == nil {
		return d
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for part := range strings.SplitSeq(s, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// Package database opens the GORM connection for the configured driver.
package database

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	// Pure Go SQLite driver — no CGO / gcc needed.
	"github.com/glebarez/sqlite"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"go-mvc/config"
)

// Connect opens a connection using DB_DRIVER (sqlite | mysql | postgres).
func Connect(cfg config.Database) (*gorm.DB, error) {
	logLevel := logger.Warn
	if cfg.Debug {
		logLevel = logger.Info
	}
	gormCfg := &gorm.Config{Logger: logger.Default.LogMode(logLevel)}

	var dialector gorm.Dialector
	switch cfg.Driver {
	case "sqlite":
		if dir := filepath.Dir(cfg.File); dir != "." {
			if err := os.MkdirAll(dir, 0o755); err != nil {
				return nil, fmt.Errorf("create sqlite directory: %w", err)
			}
		}
		dialector = sqlite.Open(cfg.File + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)")

	case "mysql":
		dsn := fmt.Sprintf(
			"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=%s",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name, url.QueryEscape(cfg.Timezone),
		)
		dialector = mysql.Open(dsn)

	case "postgres":
		dsn := fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
			cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode, cfg.Timezone,
		)
		dialector = postgres.Open(dsn)

	default:
		return nil, fmt.Errorf("unsupported DB_DRIVER %q (use sqlite, mysql or postgres)", cfg.Driver)
	}

	db, err := gorm.Open(dialector, gormCfg)
	if err != nil {
		return nil, fmt.Errorf("connect to %s: %w", cfg.Driver, err)
	}
	return db, nil
}

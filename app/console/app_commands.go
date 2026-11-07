package console

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"go-mvc/bootstrap"
	"go-mvc/config"
	"go-mvc/database"
)

func init() {
	register(Command{Name: "about", Usage: "about", Description: "Display basic information about the application", Run: about})
	register(Command{Name: "down", Usage: "down", Description: "Put the application into maintenance mode", Run: down})
	register(Command{Name: "up", Usage: "up", Description: "Bring the application out of maintenance mode", Run: up})
	register(Command{Name: "db:wipe", Usage: "db:wipe [--force]", Description: "Drop all tables", Run: dbWipe})
}

func about(_ []string) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	row := func(k, v string) { fmt.Printf("  %-22s \033[32m%s\033[0m\n", k, v) }
	section := func(s string) { fmt.Printf("\n \033[33m%s\033[0m\n", s) }

	section("Environment")
	row("Application Name", cfg.App.Name)
	row("Environment", cfg.App.Env)
	row("Port", cfg.App.Port)
	row("Timezone", cfg.App.Timezone)
	row("Go Version", runtime.Version())
	row("Maintenance Mode", yesNo(exists(cfg.App.MaintenanceFile)))

	section("Drivers")
	db := cfg.Database.Driver
	if db == "sqlite" {
		db += " (" + cfg.Database.File + ")"
	}
	row("Database", db)
	row("Session", cfg.Session.Driver)

	section("Frontend")
	row("Dist Path", cfg.Vite.DistPath)
	row("Built", yesNo(exists(filepath.Join(cfg.Vite.DistPath, ".vite", "manifest.json"))))
	if b, err := os.ReadFile(cfg.Vite.HotFile); err == nil {
		row("Vite Dev Server", string(b))
	} else {
		row("Vite Dev Server", "not running")
	}
	fmt.Println()
	return nil
}

func down(_ []string) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(cfg.App.MaintenanceFile), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(cfg.App.MaintenanceFile, []byte(time.Now().Format(time.RFC3339)), 0o644); err != nil {
		return err
	}
	info("Application is now in maintenance mode.")
	return nil
}

func up(_ []string) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if err := os.Remove(cfg.App.MaintenanceFile); err != nil && !os.IsNotExist(err) {
		return err
	}
	info("Application is now live.")
	return nil
}

func dbWipe(args []string) error {
	return withMigrator(func(app *bootstrap.App, m *database.Migrator) error {
		if app.Config.App.IsProduction() {
			if _, ok := flag(args, "force"); !ok {
				return errors.New("refusing to drop all tables in production (use --force)")
			}
		}
		if err := m.Wipe(); err != nil {
			return err
		}
		info("Dropped all tables successfully.")
		return nil
	})
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func yesNo(b bool) string {
	if b {
		return "ENABLED"
	}
	return "OFF"
}

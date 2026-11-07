package console

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"os/signal"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"

	"go-mvc/bootstrap"
	"go-mvc/database"
	"go-mvc/database/migrations"
	"go-mvc/database/seeders"
)

func init() {
	register(Command{Name: "serve", Usage: "serve", Description: "Start the HTTP server", Run: serve})
	register(Command{Name: "route:list", Usage: "route:list", Description: "List all registered routes", Run: routeList})
	register(Command{Name: "key:generate", Usage: "key:generate", Description: "Print a random JWT_SECRET for .env", Run: keyGenerate})

	register(Command{Name: "migrate", Usage: "migrate [--seed]", Description: "Run pending migrations", Run: migrate})
	register(Command{Name: "migrate:rollback", Usage: "migrate:rollback [--step=N]", Description: "Roll back the last batch (or N migrations)", Run: migrateRollback})
	register(Command{Name: "migrate:reset", Usage: "migrate:reset", Description: "Roll back all migrations", Run: migrateReset})
	register(Command{Name: "migrate:fresh", Usage: "migrate:fresh [--seed]", Description: "Drop all tables and re-run all migrations", Run: migrateFresh})
	register(Command{Name: "migrate:status", Usage: "migrate:status", Description: "Show the status of each migration", Run: migrateStatus})
	register(Command{Name: "db:seed", Usage: "db:seed", Description: "Seed the database", Run: dbSeed})
}

func serve(_ []string) error {
	app, err := bootstrap.Load()
	if err != nil {
		return err
	}
	defer app.Close()

	if pending, err := newMigrator(app).Pending(); err == nil && len(pending) > 0 {
		log.Printf("\033[33mWARN\033[0m %d pending migration(s) — run: go run . migrate", len(pending))
	}

	http := app.BuildHTTP()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errc := make(chan error, 1)
	go func() { errc <- http.Listen(":" + app.Config.App.Port) }()

	select {
	case err := <-errc:
		return err
	case <-ctx.Done():
		log.Println("Shutting down...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return http.ShutdownWithContext(shutdownCtx)
	}
}

func routeList(_ []string) error {
	app, err := bootstrap.Load()
	if err != nil {
		return err
	}
	defer app.Close()

	routes := app.BuildHTTP().GetRoutes(true)
	sort.SliceStable(routes, func(i, j int) bool { return routes[i].Path < routes[j].Path })
	for _, r := range routes {
		if r.Method == "HEAD" {
			continue
		}
		fmt.Printf("  \033[33m%-7s\033[0m %s\n", r.Method, r.Path)
	}
	return nil
}

func keyGenerate(_ []string) error {
	b := make([]byte, 48)
	if _, err := rand.Read(b); err != nil {
		return err
	}
	fmt.Printf("JWT_SECRET=%s\n", base64.RawURLEncoding.EncodeToString(b))
	return nil
}

func newMigrator(app *bootstrap.App) *database.Migrator {
	return database.NewMigrator(app.DB, migrations.All())
}

func withMigrator(fn func(app *bootstrap.App, m *database.Migrator) error) error {
	app, err := bootstrap.Load()
	if err != nil {
		return err
	}
	defer app.Close()
	return fn(app, newMigrator(app))
}

func report(verb string, names []string) {
	if len(names) == 0 {
		info("Nothing to %s.", strings.ToLower(verb))
		return
	}
	for _, n := range names {
		done("%s %s", verb, n)
	}
}

func seed(app *bootstrap.App) error {
	info("Seeding database.")
	return seeders.Run(app.DB, func(name string) { done("%s", name) })
}

func migrate(args []string) error {
	return withMigrator(func(app *bootstrap.App, m *database.Migrator) error {
		ran, err := m.Up()
		report("Migrated", ran)
		if err != nil {
			return err
		}
		if _, ok := flag(args, "seed"); ok {
			return seed(app)
		}
		return nil
	})
}

func migrateRollback(args []string) error {
	steps := 0
	if v, ok := flag(args, "step"); ok {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			return errors.New("--step must be a positive number")
		}
		steps = n
	}
	return withMigrator(func(_ *bootstrap.App, m *database.Migrator) error {
		rolled, err := m.Rollback(steps)
		report("Rolled back", rolled)
		return err
	})
}

func migrateReset(_ []string) error {
	return withMigrator(func(_ *bootstrap.App, m *database.Migrator) error {
		rolled, err := m.Reset()
		report("Rolled back", rolled)
		return err
	})
}

func migrateFresh(args []string) error {
	return withMigrator(func(app *bootstrap.App, m *database.Migrator) error {
		if app.Config.App.IsProduction() {
			if _, ok := flag(args, "force"); !ok {
				return errors.New("refusing to drop all tables in production (use --force)")
			}
		}
		info("Dropping all tables.")
		ran, err := m.Fresh()
		report("Migrated", ran)
		if err != nil {
			return err
		}
		if _, ok := flag(args, "seed"); ok {
			return seed(app)
		}
		return nil
	})
}

func migrateStatus(_ []string) error {
	return withMigrator(func(_ *bootstrap.App, m *database.Migrator) error {
		statuses, err := m.Status()
		if err != nil {
			return err
		}
		for _, s := range statuses {
			state := "\033[33mPending\033[0m"
			if s.Ran {
				state = fmt.Sprintf("\033[32mRan\033[0m [%d]", s.Batch)
			}
			fmt.Printf("  %-55s %s\n", s.Name, state)
		}
		return nil
	})
}

func dbSeed(_ []string) error {
	app, err := bootstrap.Load()
	if err != nil {
		return err
	}
	defer app.Close()
	return seed(app)
}

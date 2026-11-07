package console

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"go-mvc/bootstrap"
)

func init() {
	register(Command{Name: "model:show", Usage: "model:show Model", Description: "Show a model's table, columns and indexes", Run: modelShow})
}

func modelShow(args []string) error {
	name, err := nameArg(args, "model")
	if err != nil {
		return err
	}
	n := newModelNames(name)

	app, err := bootstrap.Load()
	if err != nil {
		return err
	}
	defer app.Close()

	db := app.DB.Session(&gorm.Session{Logger: logger.Discard})
	m := db.Migrator()
	if !m.HasTable(n.Table) {
		return fmt.Errorf("table %q for model %s does not exist (run ./forge migrate?)", n.Table, n.Model)
	}

	var count int64
	if err := db.Table(n.Table).Count(&count).Error; err != nil {
		return err
	}

	row := func(k, v string) { fmt.Printf("  %-24s \033[32m%s\033[0m\n", k, v) }
	section := func(s string) { fmt.Printf("\n \033[33m%s\033[0m\n", s) }

	section(n.Model)
	row("Model", "go-mvc/app/models."+n.Model)
	row("Table", n.Table)
	row("Database", app.Config.Database.Driver)
	row("Rows", fmt.Sprint(count))

	cols, err := m.ColumnTypes(n.Table)
	if err != nil {
		return err
	}
	section("Columns")
	for _, c := range cols {
		var attrs []string
		pk, _ := c.PrimaryKey()
		if pk {
			attrs = append(attrs, "primary")
		}
		if u, ok := c.Unique(); ok && u {
			attrs = append(attrs, "unique")
		}
		if nullable, ok := c.Nullable(); ok && nullable && !pk {
			attrs = append(attrs, "nullable")
		}
		if d, ok := c.DefaultValue(); ok && d != "" {
			attrs = append(attrs, "default "+d)
		}
		fmt.Printf("  %-24s \033[32m%-14s\033[0m %s\n", c.Name(), strings.ToLower(c.DatabaseTypeName()), strings.Join(attrs, ", "))
	}

	if idx, err := m.GetIndexes(n.Table); err == nil && len(idx) > 0 {
		section("Indexes")
		for _, i := range idx {
			kind := ""
			if u, ok := i.Unique(); ok && u {
				kind = "unique"
			}
			if p, ok := i.PrimaryKey(); ok && p {
				kind = "primary"
			}
			fmt.Printf("  %-24s \033[32m%-14s\033[0m %s\n", i.Name(), strings.Join(i.Columns(), ", "), kind)
		}
	}
	fmt.Println()
	return nil
}

package database

import (
	"fmt"
	"slices"
	"strings"
	"time"

	"gorm.io/gorm"
)

// Migration is a versioned, reversible schema change. Name doubles as the
// version: migrations run in lexical order (hence the timestamp prefix).
type Migration struct {
	Name string
	Up   func(tx *gorm.DB) error
	Down func(tx *gorm.DB) error
}

// migrationRecord is a row in the "migrations" table, like Laravel's.
type migrationRecord struct {
	ID        uint   `gorm:"primaryKey"`
	Migration string `gorm:"size:255;uniqueIndex;not null"`
	Batch     int    `gorm:"not null"`
	CreatedAt time.Time
}

func (migrationRecord) TableName() string { return "migrations" }

// MigrationStatus is one line of `migrate:status`.
type MigrationStatus struct {
	Name  string
	Ran   bool
	Batch int
}

type Migrator struct {
	db         *gorm.DB
	migrations []Migration
}

func NewMigrator(db *gorm.DB, migrations []Migration) *Migrator {
	sorted := slices.Clone(migrations)
	slices.SortFunc(sorted, func(a, b Migration) int { return strings.Compare(a.Name, b.Name) })
	return &Migrator{db: db, migrations: sorted}
}

func (m *Migrator) ensureTable() error {
	return m.db.AutoMigrate(&migrationRecord{})
}

func (m *Migrator) ran() (map[string]migrationRecord, error) {
	if err := m.ensureTable(); err != nil {
		return nil, err
	}
	var records []migrationRecord
	if err := m.db.Find(&records).Error; err != nil {
		return nil, err
	}
	out := make(map[string]migrationRecord, len(records))
	for _, r := range records {
		out[r.Migration] = r
	}
	return out, nil
}

// Pending returns the names of migrations that have not run yet.
func (m *Migrator) Pending() ([]string, error) {
	ran, err := m.ran()
	if err != nil {
		return nil, err
	}
	var pending []string
	for _, mig := range m.migrations {
		if _, ok := ran[mig.Name]; !ok {
			pending = append(pending, mig.Name)
		}
	}
	return pending, nil
}

// Up runs every pending migration in a new batch.
func (m *Migrator) Up() ([]string, error) {
	ran, err := m.ran()
	if err != nil {
		return nil, err
	}

	var batch int
	if err := m.db.Model(&migrationRecord{}).Select("COALESCE(MAX(batch), 0)").Scan(&batch).Error; err != nil {
		return nil, err
	}
	batch++

	var done []string
	for _, mig := range m.migrations {
		if _, ok := ran[mig.Name]; ok {
			continue
		}
		err := m.db.Transaction(func(tx *gorm.DB) error {
			if err := mig.Up(tx); err != nil {
				return err
			}
			return tx.Create(&migrationRecord{Migration: mig.Name, Batch: batch}).Error
		})
		if err != nil {
			return done, fmt.Errorf("migrate %s: %w", mig.Name, err)
		}
		done = append(done, mig.Name)
	}
	return done, nil
}

// Rollback reverts the last batch (or the last `steps` migrations when steps > 0).
func (m *Migrator) Rollback(steps int) ([]string, error) {
	if err := m.ensureTable(); err != nil {
		return nil, err
	}

	q := m.db.Order("batch DESC, migration DESC")
	if steps > 0 {
		q = q.Limit(steps)
	} else {
		var last int
		if err := m.db.Model(&migrationRecord{}).Select("COALESCE(MAX(batch), 0)").Scan(&last).Error; err != nil {
			return nil, err
		}
		q = q.Where("batch = ?", last)
	}

	var records []migrationRecord
	if err := q.Find(&records).Error; err != nil {
		return nil, err
	}
	return m.down(records)
}

// Reset reverts every migration.
func (m *Migrator) Reset() ([]string, error) {
	if err := m.ensureTable(); err != nil {
		return nil, err
	}
	var records []migrationRecord
	if err := m.db.Order("batch DESC, migration DESC").Find(&records).Error; err != nil {
		return nil, err
	}
	return m.down(records)
}

// Wipe drops every table in the database.
func (m *Migrator) Wipe() error {
	tables, err := m.db.Migrator().GetTables()
	if err != nil {
		return err
	}
	for _, t := range tables {
		if strings.HasPrefix(t, "sqlite_") {
			continue
		}
		if err := m.db.Migrator().DropTable(t); err != nil {
			return fmt.Errorf("drop %s: %w", t, err)
		}
	}
	return nil
}

// Fresh drops every table and runs all migrations from scratch.
func (m *Migrator) Fresh() ([]string, error) {
	if err := m.Wipe(); err != nil {
		return nil, err
	}
	return m.Up()
}

// Status lists every known migration and whether it ran.
func (m *Migrator) Status() ([]MigrationStatus, error) {
	ran, err := m.ran()
	if err != nil {
		return nil, err
	}
	out := make([]MigrationStatus, 0, len(m.migrations))
	for _, mig := range m.migrations {
		r, ok := ran[mig.Name]
		out = append(out, MigrationStatus{Name: mig.Name, Ran: ok, Batch: r.Batch})
	}
	return out, nil
}

func (m *Migrator) down(records []migrationRecord) ([]string, error) {
	byName := make(map[string]Migration, len(m.migrations))
	for _, mig := range m.migrations {
		byName[mig.Name] = mig
	}

	var done []string
	for _, rec := range records {
		mig, ok := byName[rec.Migration]
		if !ok {
			return done, fmt.Errorf("migration %s ran but no longer exists", rec.Migration)
		}
		err := m.db.Transaction(func(tx *gorm.DB) error {
			if mig.Down != nil {
				if err := mig.Down(tx); err != nil {
					return err
				}
			}
			return tx.Delete(&migrationRecord{}, rec.ID).Error
		})
		if err != nil {
			return done, fmt.Errorf("rollback %s: %w", rec.Migration, err)
		}
		done = append(done, rec.Migration)
	}
	return done, nil
}

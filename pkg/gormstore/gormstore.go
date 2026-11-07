// Package gormstore is a fiber.Storage backed by the "sessions" table, so
// sessions survive restarts on SQLite, MySQL and PostgreSQL alike.
package gormstore

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type row struct {
	ID        string `gorm:"primaryKey;size:128"`
	Data      []byte
	ExpiresAt int64
}

type Storage struct {
	db   *gorm.DB
	done chan struct{}
}

func (row) TableName() string { return "sessions" }

// New returns a storage and starts a garbage collector for expired rows.
func New(db *gorm.DB, gcInterval time.Duration) *Storage {
	s := &Storage{db: db, done: make(chan struct{})}
	go s.gc(gcInterval)
	return s
}

func (s *Storage) GetWithContext(ctx context.Context, key string) ([]byte, error) {
	if key == "" {
		return nil, nil
	}
	var r row
	err := s.db.WithContext(ctx).Where("id = ?", key).Take(&r).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if r.ExpiresAt != 0 && r.ExpiresAt <= time.Now().Unix() {
		return nil, nil
	}
	return r.Data, nil
}

func (s *Storage) Get(key string) ([]byte, error) {
	return s.GetWithContext(context.Background(), key)
}

func (s *Storage) SetWithContext(ctx context.Context, key string, val []byte, exp time.Duration) error {
	if key == "" || len(val) == 0 {
		return nil
	}
	var expiresAt int64
	if exp > 0 {
		expiresAt = time.Now().Add(exp).Unix()
	}
	return s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"data", "expires_at"}),
	}).Create(&row{ID: key, Data: val, ExpiresAt: expiresAt}).Error
}

func (s *Storage) Set(key string, val []byte, exp time.Duration) error {
	return s.SetWithContext(context.Background(), key, val, exp)
}

func (s *Storage) DeleteWithContext(ctx context.Context, key string) error {
	if key == "" {
		return nil
	}
	return s.db.WithContext(ctx).Where("id = ?", key).Delete(&row{}).Error
}

func (s *Storage) Delete(key string) error {
	return s.DeleteWithContext(context.Background(), key)
}

func (s *Storage) ResetWithContext(ctx context.Context) error {
	return s.db.WithContext(ctx).Where("1 = 1").Delete(&row{}).Error
}

func (s *Storage) Reset() error {
	return s.ResetWithContext(context.Background())
}

func (s *Storage) Close() error {
	close(s.done)
	return nil
}

func (s *Storage) gc(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-s.done:
			return
		case <-ticker.C:
			s.db.Where("expires_at <> 0 AND expires_at <= ?", time.Now().Unix()).Delete(&row{})
		}
	}
}

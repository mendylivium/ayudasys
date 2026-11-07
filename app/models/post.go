package models

import (
	"time"

	"gorm.io/gorm"
)

type Post struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Title     string         `gorm:"size:255;not null" json:"title"`
	Body      string         `gorm:"type:text" json:"body"`
	Published bool           `gorm:"default:false" json:"published"`
	UserID    uint           `gorm:"not null" json:"user_id"`
	User      *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Published scopes a query to published posts.
func Published(db *gorm.DB) *gorm.DB {
	return db.Where("published = ?", true)
}

// WithAuthor preloads the author's public fields only (no email/role).
func WithAuthor(db *gorm.DB) *gorm.DB {
	return db.Preload("User", func(tx *gorm.DB) *gorm.DB {
		return tx.Select("id", "name")
	})
}

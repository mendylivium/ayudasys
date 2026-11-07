package migrations

import (
	"time"

	"gorm.io/gorm"

	"go-mvc/database"
)

func init() {
	type user struct {
		ID uint `gorm:"primaryKey"`
	}
	type post struct {
		ID        uint   `gorm:"primaryKey"`
		Title     string `gorm:"size:255;not null"`
		Body      string `gorm:"type:text"`
		Published bool   `gorm:"not null;default:false;index"`
		UserID    uint   `gorm:"not null;index"`
		User      user   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
		CreatedAt time.Time
		UpdatedAt time.Time
		DeletedAt gorm.DeletedAt `gorm:"index"`
	}

	register(database.Migration{
		Name: "2026_09_25_000002_create_posts_table",
		Up: func(tx *gorm.DB) error {
			return tx.Table("posts").Migrator().CreateTable(&post{})
		},
		Down: func(tx *gorm.DB) error {
			return tx.Migrator().DropTable("posts")
		},
	})
}

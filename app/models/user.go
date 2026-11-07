package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	RoleUser  = "user"
	RoleAdmin = "admin"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100;not null" json:"name"`
	Email     string         `gorm:"size:100;uniqueIndex;not null" json:"email,omitzero"`
	Password  string         `gorm:"not null" json:"-"` // hidden from JSON
	Role      string         `gorm:"size:20;default:user" json:"role,omitzero"`
	Posts     []Post         `gorm:"foreignKey:UserID" json:"posts,omitempty"`
	CreatedAt time.Time      `json:"created_at,omitzero"`
	UpdatedAt time.Time      `json:"updated_at,omitzero"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // soft delete
}

// HashPassword hashes the plain-text password using bcrypt.
func (u *User) HashPassword(plain string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hash)
	return nil
}

// CheckPassword compares a plain-text password against the stored hash.
func (u *User) CheckPassword(plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(plain)) == nil
}

func (u *User) IsAdmin() bool { return u.Role == RoleAdmin }

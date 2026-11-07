package models

import "time"

const RoleEnumerator = "enumerator"
const RoleDistributor = "distributor"

type Household struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Head       string    `gorm:"size:150;not null" json:"head"`
	Address    string    `json:"address"`
	Purok      string    `json:"purok"`
	Phone      string    `json:"phone"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	Members    []Member  `json:"members"`
	RecordedBy uint      `json:"recorded_by"`
	CreatedAt  time.Time `json:"created_at"`
}
type Member struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	HouseholdID  uint   `gorm:"index;not null" json:"household_id"`
	Name         string `json:"name"`
	Relationship string `json:"relationship"`
	Age          int    `json:"age"`
}
type Program struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Name       string    `json:"name"`
	Assistance string    `json:"assistance"`
	Venue      string    `json:"venue"`
	Date       string    `json:"date"`
	Status     string    `gorm:"default:open" json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}
type Enrollment struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	HouseholdID uint      `gorm:"uniqueIndex:household_program;not null" json:"household_id"`
	ProgramID   uint      `gorm:"uniqueIndex:household_program;not null" json:"program_id"`
	Token       string    `gorm:"size:64;uniqueIndex;not null" json:"token"`
	Household   Household `json:"household"`
	Program     Program   `json:"program"`
	CreatedAt   time.Time `json:"created_at"`
}
type Claim struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	EnrollmentID uint       `gorm:"uniqueIndex;not null" json:"enrollment_id"`
	Enrollment   Enrollment `json:"enrollment"`
	ReleasedBy   uint       `json:"released_by"`
	Officer      User       `gorm:"foreignKey:ReleasedBy" json:"officer"`
	Claimant     string     `json:"claimant"`
	CreatedAt    time.Time  `json:"created_at"`
}

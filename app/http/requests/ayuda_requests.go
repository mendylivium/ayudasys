package requests

import "strings"

type CensusMember struct {
	Name         string `json:"name" validate:"required,max=150"`
	Relationship string `json:"relationship" validate:"required,max=60"`
	Age          int    `json:"age" validate:"min=0,max=120"`
}
type CensusRequest struct {
	Head      string         `json:"head" validate:"required,max=150"`
	Address   string         `json:"address" validate:"required,max=300"`
	Purok     string         `json:"purok" validate:"required,max=80"`
	Phone     string         `json:"phone" validate:"omitempty,max=30"`
	Latitude  *float64       `json:"latitude" validate:"required,min=-90,max=90"`
	Longitude *float64       `json:"longitude" validate:"required,min=-180,max=180"`
	Members   []CensusMember `json:"members" validate:"max=50,dive"`
}

func (r *CensusRequest) Normalize() {
	r.Head = strings.TrimSpace(r.Head)
	r.Address = strings.TrimSpace(r.Address)
	r.Purok = strings.TrimSpace(r.Purok)
	for i := range r.Members {
		r.Members[i].Name = strings.TrimSpace(r.Members[i].Name)
		r.Members[i].Relationship = strings.TrimSpace(r.Members[i].Relationship)
	}
}

type ProgramRequest struct {
	Name       string `json:"name" validate:"required,max=150"`
	Assistance string `json:"assistance" validate:"required,max=200"`
	Venue      string `json:"venue" validate:"required,max=200"`
	Date       string `json:"date" validate:"required,datetime=2006-01-02"`
}
type EnrollmentRequest struct {
	HouseholdID uint `json:"household_id" validate:"required"`
	ProgramID   uint `json:"program_id" validate:"required"`
}
type ClaimRequest struct {
	Token     string `json:"token" validate:"required,len=64,hexadecimal"`
	ProgramID uint   `json:"program_id" validate:"required"`
	Claimant  string `json:"claimant" validate:"required,max=150"`
}

func (r *ClaimRequest) Normalize() { r.Claimant = strings.TrimSpace(r.Claimant) }

type StaffRequest struct {
	Name     string `json:"name" validate:"required,max=100"`
	Email    string `json:"email" validate:"required,email,max=100"`
	Password string `json:"password" validate:"required,min=12,max=72"`
	Role     string `json:"role" validate:"required,oneof=enumerator distributor admin"`
}

func (r *StaffRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Email = normalizeEmail(r.Email)
}

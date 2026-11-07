package requests

import "strings"

type LoginRequest struct {
	Email    string `json:"email" form:"email" validate:"required,email"`
	Password string `json:"password" form:"password" validate:"required"`
}

func (r *LoginRequest) Normalize() { r.Email = normalizeEmail(r.Email) }

type RegisterRequest struct {
	Name                 string `json:"name" form:"name" validate:"required,max=100"`
	Email                string `json:"email" form:"email" validate:"required,email,max=100"`
	Password             string `json:"password" form:"password" validate:"required,min=8,max=72"`
	PasswordConfirmation string `json:"password_confirmation" form:"password_confirmation" validate:"omitempty,eqfield=Password"`
}

func (r *RegisterRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Email = normalizeEmail(r.Email)
}

// WebRegisterRequest requires the confirmation field (the API keeps it optional).
type WebRegisterRequest struct {
	Name                 string `json:"name" form:"name" validate:"required,max=100"`
	Email                string `json:"email" form:"email" validate:"required,email,max=100"`
	Password             string `json:"password" form:"password" validate:"required,min=8,max=72"`
	PasswordConfirmation string `json:"password_confirmation" form:"password_confirmation" validate:"required,eqfield=Password"`
}

func (r *WebRegisterRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Email = normalizeEmail(r.Email)
}

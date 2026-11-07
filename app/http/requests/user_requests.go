package requests

import "strings"

type UpdateProfileRequest struct {
	Name  string `json:"name" form:"name" validate:"required,max=100"`
	Email string `json:"email" form:"email" validate:"required,email,max=100"`
}

func (r *UpdateProfileRequest) Normalize() {
	r.Name = strings.TrimSpace(r.Name)
	r.Email = normalizeEmail(r.Email)
}

type UpdatePasswordRequest struct {
	CurrentPassword      string `json:"current_password" form:"current_password" validate:"required"`
	Password             string `json:"password" form:"password" validate:"required,min=8,max=72"`
	PasswordConfirmation string `json:"password_confirmation" form:"password_confirmation" validate:"required,eqfield=Password"`
}

// UpdateUserRequest is used by the API (name only, like before).
type UpdateUserRequest struct {
	Name string `json:"name" form:"name" validate:"omitempty,max=100"`
}

func (r *UpdateUserRequest) Normalize() { r.Name = strings.TrimSpace(r.Name) }

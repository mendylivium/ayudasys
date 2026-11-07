package requests

import "strings"

type StorePostRequest struct {
	Title     string `json:"title" form:"title" validate:"required,max=255"`
	Body      string `json:"body" form:"body"`
	Published bool   `json:"published" form:"published"`
}

func (r *StorePostRequest) Normalize() { r.Title = strings.TrimSpace(r.Title) }

// UpdatePostRequest uses pointers so the API can send partial updates.
type UpdatePostRequest struct {
	Title     *string `json:"title" form:"title" validate:"omitnil,min=1,max=255"`
	Body      *string `json:"body" form:"body"`
	Published *bool   `json:"published" form:"published"`
}

func (r *UpdatePostRequest) Normalize() {
	if r.Title != nil {
		t := strings.TrimSpace(*r.Title)
		r.Title = &t
	}
}

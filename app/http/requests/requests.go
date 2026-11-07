// Package requests contains FormRequest-style input structs. Each one is bound
// from the request body (JSON or form) and validated with struct tags.
package requests

import (
	"strings"

	"github.com/gofiber/fiber/v3"

	"go-mvc/pkg/validation"
)

// Normalizer is implemented by requests that clean their input before validation.
type Normalizer interface{ Normalize() }

// Bind parses the body into req and validates it. A malformed body returns a
// *fiber.Error; failed validation returns validation.Errors.
func Bind(c fiber.Ctx, req any) error {
	if err := c.Bind().Body(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request body")
	}
	if n, ok := req.(Normalizer); ok {
		n.Normalize()
	}
	if errs := validation.Validate(req); errs != nil {
		return errs
	}
	return nil
}

func normalizeEmail(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

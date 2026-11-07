// Package api holds the JSON API controllers (JWT guard, /api prefix).
package api

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v3"

	"go-mvc/app/http/requests"
	"go-mvc/pkg/response"
	"go-mvc/pkg/validation"
)

// bind parses and validates req. When ok=false the error response was
// already written, so the caller should just return err.
func bind(c fiber.Ctx, req any) (ok bool, err error) {
	err = requests.Bind(c, req)
	if err == nil {
		return true, nil
	}
	var verrs validation.Errors
	if errors.As(err, &verrs) {
		return false, response.ValidationFailed(c, verrs)
	}
	return false, response.BadRequest(c, "Invalid request body")
}

func paramID(c fiber.Ctx) (uint, bool) {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	return uint(id), err == nil
}

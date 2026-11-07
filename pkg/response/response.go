// Package response provides the JSON envelope used by the /api routes.
package response

import "github.com/gofiber/fiber/v3"

type Response struct {
	Success bool              `json:"success"`
	Message string            `json:"message,omitempty"`
	Data    any               `json:"data,omitempty"`
	Error   string            `json:"error,omitempty"`
	Errors  map[string]string `json:"errors,omitempty"`
}

func OK(c fiber.Ctx, message string, data any) error {
	return c.Status(fiber.StatusOK).JSON(Response{Success: true, Message: message, Data: data})
}

func Created(c fiber.Ctx, message string, data any) error {
	return c.Status(fiber.StatusCreated).JSON(Response{Success: true, Message: message, Data: data})
}

func Error(c fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(Response{Success: false, Error: message})
}

func BadRequest(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusBadRequest, message)
}

func Unauthorized(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusUnauthorized, message)
}

func Forbidden(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusForbidden, message)
}

func NotFound(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusNotFound, message)
}

func InternalError(c fiber.Ctx, message string) error {
	return Error(c, fiber.StatusInternalServerError, message)
}

// ValidationFailed responds 422 with a field => message map.
func ValidationFailed(c fiber.Ctx, errors map[string]string) error {
	return c.Status(fiber.StatusUnprocessableEntity).JSON(Response{
		Success: false,
		Error:   "The given data was invalid.",
		Errors:  errors,
	})
}

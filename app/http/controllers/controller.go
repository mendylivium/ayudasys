// Package controllers holds the web (Inertia) controllers. JSON API
// controllers live in the api sub-package.
package controllers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v3"

	"go-mvc/app/http/requests"
	"go-mvc/pkg/session"
	"go-mvc/pkg/validation"
)

// bind parses and validates req. When it returns ok=false the response has
// already been handled (redirected back with errors, like Laravel), so the
// caller should just return err.
func bind(c fiber.Ctx, req any) (ok bool, err error) {
	err = requests.Bind(c, req)
	var verrs validation.Errors
	if errors.As(err, &verrs) {
		session.FlashErrors(c, verrs)
		return false, c.Redirect().Back("/")
	}
	return err == nil, err
}

// back redirects to the previous page with a flash message.
func back(c fiber.Ctx, kind, message string) error {
	session.Flash(c, kind, message)
	return c.Redirect().Back("/")
}

// redirect goes to url with a flash message.
func redirect(c fiber.Ctx, url, kind, message string) error {
	session.Flash(c, kind, message)
	return c.Redirect().To(url)
}

// paramID parses the :id route parameter.
func paramID(c fiber.Ctx) (uint, error) {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return 0, fiber.ErrNotFound
	}
	return uint(id), nil
}

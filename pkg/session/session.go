// Package session offers Laravel-style helpers (flash data, validation errors,
// intended URL) on top of Fiber's session middleware.
//
// Values are stored as strings/JSON so the gob-encoded session never needs
// custom type registration.
package session

import (
	"encoding/json"

	fsession "github.com/gofiber/fiber/v3/middleware/session"

	"github.com/gofiber/fiber/v3"
)

const (
	flashKey  = "_flash"
	errorsKey = "_errors"
)

func store(c fiber.Ctx) *fsession.Middleware {
	return fsession.FromContext(c)
}

// Get returns a session value (nil when there is no session).
func Get(c fiber.Ctx, key string) any {
	if s := store(c); s != nil {
		return s.Get(key)
	}
	return nil
}

func Put(c fiber.Ctx, key string, value any) {
	if s := store(c); s != nil {
		s.Set(key, value)
	}
}

func Forget(c fiber.Ctx, key string) {
	if s := store(c); s != nil {
		s.Delete(key)
	}
}

// Pull returns a string value and removes it.
func Pull(c fiber.Ctx, key string) string {
	v, _ := Get(c, key).(string)
	Forget(c, key)
	return v
}

// Regenerate issues a new session ID (call on login to prevent fixation).
func Regenerate(c fiber.Ctx) error {
	if s := store(c); s != nil {
		return s.Regenerate()
	}
	return nil
}

// Invalidate destroys the session data and issues a new ID (logout).
func Invalidate(c fiber.Ctx) error {
	if s := store(c); s != nil {
		return s.Reset()
	}
	return nil
}

// Flash stores a message for the next request only (e.g. "success", "error").
func Flash(c fiber.Ctx, key, message string) {
	m := readMap(c, flashKey)
	m[key] = message
	writeMap(c, flashKey, m)
}

// PullFlash returns and clears the flashed messages.
func PullFlash(c fiber.Ctx) map[string]string {
	m := readMap(c, flashKey)
	Forget(c, flashKey)
	return m
}

// FlashErrors stores validation errors for the next request.
func FlashErrors(c fiber.Ctx, errs map[string]string) {
	writeMap(c, errorsKey, errs)
}

// PullErrors returns and clears the flashed validation errors.
func PullErrors(c fiber.Ctx) map[string]string {
	m := readMap(c, errorsKey)
	Forget(c, errorsKey)
	return m
}

func readMap(c fiber.Ctx, key string) map[string]string {
	m := map[string]string{}
	if raw, ok := Get(c, key).(string); ok {
		_ = json.Unmarshal([]byte(raw), &m)
	}
	return m
}

func writeMap(c fiber.Ctx, key string, m map[string]string) {
	raw, _ := json.Marshal(m)
	Put(c, key, string(raw))
}

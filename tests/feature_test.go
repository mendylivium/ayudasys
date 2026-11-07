// Package tests holds HTTP feature tests that run the whole app against a
// throwaway SQLite database.
package tests

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"

	"go-mvc/bootstrap"
	"go-mvc/database"
	"go-mvc/database/migrations"
	"go-mvc/database/seeders"
)

func setup(t *testing.T) *fiber.App {
	t.Helper()
	t.Setenv("APP_ENV", "testing")
	t.Setenv("DB_DRIVER", "sqlite")
	t.Setenv("DB_FILE", filepath.Join(t.TempDir(), "test.db"))
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("SESSION_DRIVER", "memory")

	app, err := bootstrap.Load()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Close)

	if _, err := database.NewMigrator(app.DB, migrations.All()).Up(); err != nil {
		t.Fatal(err)
	}
	if err := seeders.Run(app.DB, func(string) {}); err != nil {
		t.Fatal(err)
	}
	return app.BuildHTTP()
}

func send(t *testing.T, app *fiber.App, method, path, body string, headers map[string]string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func decode(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	var out map[string]any
	b, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatalf("invalid JSON %q: %v", b, err)
	}
	return out
}

func TestStaffAPI(t *testing.T) {
	app := setup(t)
	resp := send(t, app, "POST", "/api/auth/register", `{"name":"Ana","email":"ana@example.com","password":"password123"}`, nil)
	if resp.StatusCode != 404 {
		t.Fatalf("public registration must be disabled: %d", resp.StatusCode)
	}
	resp = send(t, app, "POST", "/api/auth/login", `{"email":"admin@example.com","password":"password"}`, nil)
	if resp.StatusCode != 200 {
		t.Fatalf("login: %d", resp.StatusCode)
	}
	token := decode(t, resp)["data"].(map[string]any)["token"].(string)
	resp = send(t, app, "GET", "/api/auth/me", "", map[string]string{"Authorization": "Bearer " + token})
	if resp.StatusCode != 200 {
		t.Fatalf("me: %d", resp.StatusCode)
	}
	resp = send(t, app, "GET", "/api/auth/me", "", nil)
	if resp.StatusCode != 401 {
		t.Fatalf("unauthenticated: %d", resp.StatusCode)
	}
}
func TestWebInertiaPages(t *testing.T) {
	app := setup(t)
	inertia := map[string]string{"X-Inertia": "true", "X-Inertia-Version": ""}

	resp := send(t, app, "GET", "/login", "", inertia)
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("login page: %d", resp.StatusCode)
	}
	if page := decode(t, resp); page["component"] != "Auth/Login" {
		t.Fatalf("unexpected component %v", page["component"])
	}

	resp = send(t, app, "GET", "/dashboard", "", inertia)
	if resp.StatusCode != fiber.StatusSeeOther || resp.Header.Get("Location") != "/login" {
		t.Fatalf("guest should be redirected to /login, got %d %s", resp.StatusCode, resp.Header.Get("Location"))
	}

	resp = send(t, app, "POST", "/login", `{"email":"admin@example.com","password":"password"}`, inertia)
	if resp.StatusCode != 419 {
		t.Fatalf("expected 419 without CSRF token, got %d", resp.StatusCode)
	}

	resp = send(t, app, "GET", "/nope", "", inertia)
	page := decode(t, resp)
	if resp.StatusCode != fiber.StatusNotFound || page["component"] != "Error" {
		t.Fatalf("expected Inertia Error page, got %d %v", resp.StatusCode, page["component"])
	}
}

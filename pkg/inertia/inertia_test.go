package inertia

import (
	"encoding/json"
	"html/template"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func newApp(t *testing.T) *fiber.App {
	t.Helper()
	in := New(Config{
		Template: template.Must(template.New("app").Parse(`<script data-page="app" type="application/json">{{ .page }}</script>`)),
		Version:  func() string { return "v1" },
	})
	app := fiber.New()
	app.Use(in.Middleware())
	app.Use(func(c fiber.Ctx) error {
		Share(c, "shared", "yes")
		Share(c, "lazy", Optional(func() any { return "loaded" }))
		return c.Next()
	})
	app.Get("/page", func(c fiber.Ctx) error {
		return Render(c, "Users/Index", fiber.Map{"users": []string{"a"}, "count": func() any { return 1 }})
	})
	app.Put("/save", func(c fiber.Ctx) error {
		return c.Redirect().Status(fiber.StatusFound).To("/page")
	})
	return app
}

func decode(t *testing.T, body io.Reader) Page {
	t.Helper()
	var p Page
	if err := json.NewDecoder(body).Decode(&p); err != nil {
		t.Fatal(err)
	}
	return p
}

func TestFirstVisitRendersHTML(t *testing.T) {
	resp, err := newApp(t).Test(httptest.NewRequest("GET", "/page", nil))
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), `"component":"Users/Index"`) {
		t.Fatalf("page JSON missing from HTML: %s", body)
	}
	if strings.Contains(string(body), "loaded") {
		t.Fatal("optional prop must not be evaluated on a full visit")
	}
}

func TestInertiaVisitReturnsJSON(t *testing.T) {
	req := httptest.NewRequest("GET", "/page", nil)
	req.Header.Set("X-Inertia", "true")
	req.Header.Set("X-Inertia-Version", "v1")
	resp, err := newApp(t).Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.Header.Get("X-Inertia") != "true" {
		t.Fatal("missing X-Inertia response header")
	}
	p := decode(t, resp.Body)
	if p.Component != "Users/Index" || p.Props["shared"] != "yes" || p.Props["count"] != float64(1) || p.Version != "v1" {
		t.Fatalf("unexpected page: %+v", p)
	}
}

func TestPartialReload(t *testing.T) {
	req := httptest.NewRequest("GET", "/page", nil)
	req.Header.Set("X-Inertia", "true")
	req.Header.Set("X-Inertia-Version", "v1")
	req.Header.Set("X-Inertia-Partial-Component", "Users/Index")
	req.Header.Set("X-Inertia-Partial-Data", "lazy")
	resp, err := newApp(t).Test(req)
	if err != nil {
		t.Fatal(err)
	}
	p := decode(t, resp.Body)
	if len(p.Props) != 1 || p.Props["lazy"] != "loaded" {
		t.Fatalf("expected only the lazy prop, got %+v", p.Props)
	}
}

func TestVersionMismatchForcesFullReload(t *testing.T) {
	req := httptest.NewRequest("GET", "/page", nil)
	req.Header.Set("X-Inertia", "true")
	req.Header.Set("X-Inertia-Version", "old")
	resp, err := newApp(t).Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusConflict || resp.Header.Get("X-Inertia-Location") == "" {
		t.Fatalf("expected 409 with location, got %d", resp.StatusCode)
	}
}

func TestRedirectAfterPutBecomes303(t *testing.T) {
	req := httptest.NewRequest("PUT", "/save", nil)
	req.Header.Set("X-Inertia", "true")
	req.Header.Set("X-Inertia-Version", "v1")
	resp, err := newApp(t).Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusSeeOther {
		t.Fatalf("expected 303, got %d", resp.StatusCode)
	}
}

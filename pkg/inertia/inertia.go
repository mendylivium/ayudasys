// Package inertia is a small server-side adapter implementing the Inertia.js
// protocol (https://inertiajs.com/the-protocol) for Fiber v3.
//
// Controllers return pages instead of HTML templates:
//
//	return inertia.Render(c, "Posts/Index", fiber.Map{"posts": posts})
package inertia

import (
	"bytes"
	"encoding/json"
	"html/template"
	"slices"
	"strings"

	"github.com/gofiber/fiber/v3"
)

const (
	headerInertia          = "X-Inertia"
	headerVersion          = "X-Inertia-Version"
	headerLocation         = "X-Inertia-Location"
	headerPartialComponent = "X-Inertia-Partial-Component"
	headerPartialData      = "X-Inertia-Partial-Data"
	headerPartialExcept    = "X-Inertia-Partial-Except"

	sharedKey = "inertia.shared"
)

// Page is the page object sent to the client.
type Page struct {
	Component      string         `json:"component"`
	Props          map[string]any `json:"props"`
	URL            string         `json:"url"`
	Version        string         `json:"version"`
	EncryptHistory bool           `json:"encryptHistory"`
	ClearHistory   bool           `json:"clearHistory"`
}

type Config struct {
	// Template is the root HTML view. It receives a map with "page" (the page
	// JSON as template.JS) merged with whatever ViewData returns.
	Template *template.Template
	// Version returns the current asset version.
	Version func() string
	// ViewData adds extra data to the root template (e.g. Vite tags).
	ViewData func(c fiber.Ctx) (map[string]any, error)
}

type Inertia struct {
	cfg Config
}

var instance *Inertia

// New creates the adapter and makes it available to the package-level helpers.
func New(cfg Config) *Inertia {
	if cfg.Version == nil {
		cfg.Version = func() string { return "" }
	}
	instance = &Inertia{cfg: cfg}
	return instance
}

// optionalProp is only sent when explicitly requested by a partial reload.
type optionalProp struct{ fn func() any }

// alwaysProp is sent even when a partial reload did not ask for it.
type alwaysProp struct{ value any }

// Optional marks a prop as lazy: evaluated and sent only on partial reloads
// that include it (router.reload({ only: ['key'] })).
func Optional(fn func() any) any { return optionalProp{fn} }

// Always marks a prop that is included in every response, partial or not.
func Always(value any) any { return alwaysProp{value} }

// Share adds a prop to every page rendered during this request. Values may be
// func() any to defer work until render time.
func Share(c fiber.Ctx, key string, value any) {
	shared, _ := c.Locals(sharedKey).(map[string]any)
	if shared == nil {
		shared = map[string]any{}
		c.Locals(sharedKey, shared)
	}
	shared[key] = value
}

// IsInertia reports whether the request was made by the Inertia client.
func IsInertia(c fiber.Ctx) bool {
	return c.Get(headerInertia) != ""
}

// Render sends the page as JSON (Inertia visit) or the full HTML document.
func Render(c fiber.Ctx, component string, props fiber.Map) error {
	return instance.Render(c, component, props)
}

func (in *Inertia) Render(c fiber.Ctx, component string, props fiber.Map) error {
	merged := map[string]any{}
	if shared, ok := c.Locals(sharedKey).(map[string]any); ok {
		for k, v := range shared {
			merged[k] = v
		}
	}
	for k, v := range props {
		merged[k] = v
	}

	page := Page{
		Component: component,
		Props:     resolveProps(c, component, merged),
		URL:       c.OriginalURL(),
		Version:   in.cfg.Version(),
	}

	if IsInertia(c) {
		c.Set(headerInertia, "true")
		c.Vary(headerInertia)
		return c.JSON(page)
	}

	pageJSON, err := json.Marshal(page) // escapes <, > and & so it is safe inside <script>
	if err != nil {
		return err
	}
	data := map[string]any{}
	if in.cfg.ViewData != nil {
		extra, err := in.cfg.ViewData(c)
		if err != nil {
			return err
		}
		data = extra
	}
	data["page"] = template.JS(pageJSON)

	var buf bytes.Buffer
	if err := in.cfg.Template.Execute(&buf, data); err != nil {
		return err
	}
	c.Vary(headerInertia)
	c.Type("html", "utf-8")
	return c.Send(buf.Bytes())
}

func resolveProps(c fiber.Ctx, component string, props map[string]any) map[string]any {
	partial := c.Get(headerPartialComponent) == component
	only := splitHeader(c.Get(headerPartialData))
	except := splitHeader(c.Get(headerPartialExcept))

	out := make(map[string]any, len(props))
	for key, value := range props {
		_, always := value.(alwaysProp)
		_, optional := value.(optionalProp)

		if partial && !always {
			if len(only) > 0 && !slices.Contains(only, key) {
				continue
			}
			if slices.Contains(except, key) {
				continue
			}
		}
		if !partial && optional {
			continue
		}
		out[key] = evaluate(value)
	}
	return out
}

func evaluate(v any) any {
	switch p := v.(type) {
	case alwaysProp:
		return evaluate(p.value)
	case optionalProp:
		return p.fn()
	case func() any:
		return p()
	}
	return v
}

func splitHeader(h string) []string {
	if h == "" {
		return nil
	}
	parts := strings.Split(h, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

// Location performs a full page visit to url (external redirects, or leaving the SPA).
func Location(c fiber.Ctx, url string) error {
	if IsInertia(c) {
		c.Set(headerLocation, url)
		return c.SendStatus(fiber.StatusConflict)
	}
	return c.Redirect().Status(fiber.StatusFound).To(url)
}

// Middleware handles asset version mismatches and turns 302 redirects after
// PUT/PATCH/DELETE into 303 so the browser follows them with GET.
func (in *Inertia) Middleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		if !IsInertia(c) {
			return c.Next()
		}

		if c.Method() == fiber.MethodGet && c.Get(headerVersion) != in.cfg.Version() {
			c.Set(headerLocation, c.BaseURL()+c.OriginalURL())
			return c.SendStatus(fiber.StatusConflict)
		}

		err := c.Next()

		switch c.Method() {
		case fiber.MethodPut, fiber.MethodPatch, fiber.MethodDelete:
			if c.Response().StatusCode() == fiber.StatusFound {
				c.Status(fiber.StatusSeeOther)
			}
		}
		return err
	}
}

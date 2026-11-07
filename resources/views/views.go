// Package views embeds the server-side HTML templates into the binary.
// Only the Inertia root template lives here; pages are Vue components.
package views

import (
	"embed"
	"html/template"
)

//go:embed *.html
var files embed.FS

// App is the Inertia root template (app.html).
var App = template.Must(template.ParseFS(files, "app.html"))

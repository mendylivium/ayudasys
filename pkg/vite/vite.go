// Package vite renders the <script>/<link> tags for the Vite bundle, like
// Laravel's @vite directive.
//
//   - Dev: while `npm run dev` runs, the Vite plugin writes its URL to the hot
//     file and tags point at the dev server (HMR).
//   - Prod: tags are resolved from dist/.vite/manifest.json.
package vite

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type chunk struct {
	File    string   `json:"file"`
	CSS     []string `json:"css"`
	Imports []string `json:"imports"`
	IsEntry bool     `json:"isEntry"`
}

type Vite struct {
	distPath   string
	hotFile    string
	allowHot   bool
	production bool

	mu       sync.Mutex
	manifest map[string]chunk
	version  string
}

// New creates the helper. allowHot enables the dev server when the hot file exists;
// production caches the manifest after the first read.
func New(distPath, hotFile string, allowHot, production bool) *Vite {
	return &Vite{distPath: distPath, hotFile: hotFile, allowHot: allowHot, production: production}
}

// HotURL returns the dev server URL, or "" when it is not running.
func (v *Vite) HotURL() string {
	if !v.allowHot {
		return ""
	}
	b, err := os.ReadFile(v.hotFile)
	if err != nil {
		return ""
	}
	return strings.TrimRight(strings.TrimSpace(string(b)), "/")
}

// Tags returns the HTML tags for the given entry points.
func (v *Vite) Tags(entries ...string) (template.HTML, error) {
	var b strings.Builder

	if hot := v.HotURL(); hot != "" {
		fmt.Fprintf(&b, `<script type="module" src="%s/@vite/client"></script>`, hot)
		for _, e := range entries {
			fmt.Fprintf(&b, `<script type="module" src="%s/%s"></script>`, hot, e)
		}
		return template.HTML(b.String()), nil
	}

	manifest, _, err := v.load()
	if err != nil {
		return "", err
	}

	seenCSS := map[string]bool{}
	seenImports := map[string]bool{}
	var css, preloads, scripts []string

	var walk func(key string, isEntry bool)
	walk = func(key string, isEntry bool) {
		c, ok := manifest[key]
		if !ok {
			return
		}
		for _, f := range c.CSS {
			if !seenCSS[f] {
				seenCSS[f] = true
				css = append(css, f)
			}
		}
		for _, imp := range c.Imports {
			if seenImports[imp] {
				continue
			}
			seenImports[imp] = true
			if ic, ok := manifest[imp]; ok {
				preloads = append(preloads, ic.File)
			}
			walk(imp, false)
		}
		if isEntry {
			scripts = append(scripts, c.File)
		}
	}

	for _, e := range entries {
		if _, ok := manifest[e]; !ok {
			return "", fmt.Errorf("vite: entry %q not found in manifest", e)
		}
		walk(e, true)
	}

	for _, f := range css {
		fmt.Fprintf(&b, `<link rel="stylesheet" href="/%s">`, template.HTMLEscapeString(f))
	}
	for _, f := range preloads {
		fmt.Fprintf(&b, `<link rel="modulepreload" href="/%s">`, template.HTMLEscapeString(f))
	}
	for _, f := range scripts {
		fmt.Fprintf(&b, `<script type="module" src="/%s"></script>`, template.HTMLEscapeString(f))
	}
	return template.HTML(b.String()), nil
}

// Version is the asset version used by Inertia to detect stale clients.
func (v *Vite) Version() string {
	if v.HotURL() != "" {
		return "dev"
	}
	_, version, err := v.load()
	if err != nil {
		return ""
	}
	return version
}

func (v *Vite) load() (map[string]chunk, string, error) {
	v.mu.Lock()
	defer v.mu.Unlock()

	if v.production && v.manifest != nil {
		return v.manifest, v.version, nil
	}

	path := filepath.Join(v.distPath, ".vite", "manifest.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, "", fmt.Errorf("vite: manifest not found at %s — run `npm run build` or `npm run dev`", path)
	}
	var m map[string]chunk
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, "", fmt.Errorf("vite: invalid manifest: %w", err)
	}
	sum := md5.Sum(raw)
	v.manifest, v.version = m, hex.EncodeToString(sum[:])
	return v.manifest, v.version, nil
}

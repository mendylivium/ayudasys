package vite

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestProductionTagsFromManifest(t *testing.T) {
	dist := t.TempDir()
	os.MkdirAll(filepath.Join(dist, ".vite"), 0o755)
	os.WriteFile(filepath.Join(dist, ".vite", "manifest.json"), []byte(`{
		"resources/js/app.js": {"file": "assets/app-1.js", "css": ["assets/app-1.css"], "imports": ["_vendor.js"], "isEntry": true},
		"_vendor.js": {"file": "assets/vendor-1.js", "css": ["assets/vendor-1.css"]}
	}`), 0o644)

	v := New(dist, filepath.Join(dist, "missing.hot"), true, true)
	tags, err := v.Tags("resources/js/app.js")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		`<link rel="stylesheet" href="/assets/vendor-1.css">`,
		`<link rel="stylesheet" href="/assets/app-1.css">`,
		`<link rel="modulepreload" href="/assets/vendor-1.js">`,
		`<script type="module" src="/assets/app-1.js"></script>`,
	} {
		if !strings.Contains(string(tags), want) {
			t.Errorf("missing %s in %s", want, tags)
		}
	}
	if v.Version() == "" {
		t.Error("expected a manifest hash as version")
	}
}

func TestHotFileUsesDevServer(t *testing.T) {
	dir := t.TempDir()
	hot := filepath.Join(dir, "vite.hot")
	os.WriteFile(hot, []byte("http://localhost:5173\n"), 0o644)

	tags, err := New(dir, hot, true, false).Tags("resources/js/app.js")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(tags), `src="http://localhost:5173/@vite/client"`) ||
		!strings.Contains(string(tags), `src="http://localhost:5173/resources/js/app.js"`) {
		t.Fatalf("unexpected dev tags: %s", tags)
	}

	// Production ignores a stale hot file.
	if _, err := New(dir, hot, false, true).Tags("resources/js/app.js"); err == nil {
		t.Fatal("expected manifest error when hot file is not allowed")
	}
}

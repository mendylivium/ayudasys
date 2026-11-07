package console

import (
	"bytes"
	"embed"
	"errors"
	"fmt"
	"go/format"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"text/template"
	"time"
	"unicode"
)

//go:embed stubs/*.stub
var stubs embed.FS

func init() {
	register(Command{Name: "make:controller", Usage: "make:controller Name [--api]", Description: "Create a resource controller", Run: makeController})
	register(Command{Name: "make:model", Usage: "make:model Name [-mscrRpa] [--api]", Description: "Create a model (+ migration, seeder, controller, requests, policy, pages)", Run: makeModel})
	register(Command{Name: "make:migration", Usage: "make:migration create_x_table", Description: "Create a migration file", Run: makeMigration})
	register(Command{Name: "make:request", Usage: "make:request Name", Description: "Create a validated request struct", Run: makeRequest})
	register(Command{Name: "make:middleware", Usage: "make:middleware Name", Description: "Create a middleware", Run: makeMiddleware})
	register(Command{Name: "make:seeder", Usage: "make:seeder Name", Description: "Create a database seeder", Run: makeSeeder})
	register(Command{Name: "make:policy", Usage: "make:policy Model", Description: "Create an authorization policy for a model", Run: makePolicy})
	register(Command{Name: "make:test", Usage: "make:test Name", Description: "Create an HTTP feature test", Run: makeTest})
	register(Command{Name: "make:page", Usage: "make:page Posts/Index", Description: "Create a Vue (Inertia) page", Run: makePage})
}

func makeController(args []string) error {
	name, err := nameArg(args, "controller")
	if err != nil {
		return err
	}
	name = pascal(name)
	if !strings.HasSuffix(name, "Controller") {
		name += "Controller"
	}
	resource := strings.TrimSuffix(name, "Controller")
	data := map[string]string{
		"Name":  name,
		"Pages": plural(resource),
		"Route": strings.ReplaceAll(plural(snake(resource)), "_", "-"),
	}

	stub, dir := "controller.stub", "app/http/controllers"
	if _, api := flag(args, "api"); api {
		stub, dir = "controller.api.stub", "app/http/controllers/api"
	}
	return writeStub(stub, filepath.Join(dir, snake(name)+".go"), data)
}

// modelNames holds every naming variant used by the model scaffolding stubs.
type modelNames struct {
	Model     string // BlogPost
	Var       string // blog post (for messages)
	Title     string // Blog Post
	Plural    string // Blog Posts (headings)
	Pages     string // BlogPosts (resources/js/Pages/BlogPosts)
	Route     string // blog-posts
	Table     string // blog_posts
	Name      string // BlogPostController
	Migration string // 2026_09_25_120000_create_blog_posts_table
	Requests  bool
	Policy    bool
}

func newModelNames(name string) modelNames {
	model := pascal(name)
	title := words(model)
	return modelNames{
		Model:  model,
		Var:    strings.ToLower(title),
		Title:  title,
		Plural: plural(title),
		Pages:  plural(model),
		Route:  strings.ReplaceAll(plural(snake(model)), "_", "-"),
		Table:  plural(snake(model)),
		Name:   model + "Controller",
	}
}

// makeModel scaffolds a model and, with options, everything around it:
//
//	-m  --migration    -s --seed     -c --controller  -r --resource
//	-R  --requests     -p --policy   -a --all         --api
func makeModel(args []string) error {
	name, err := nameArg(args, "model")
	if err != nil {
		return err
	}
	o := options(args, map[rune]string{
		'm': "migration", 's': "seed", 'c': "controller", 'r': "resource",
		'R': "requests", 'p': "policy", 'a': "all",
	})
	if o["all"] {
		o["migration"], o["seed"], o["controller"], o["requests"], o["policy"] = true, true, true, true, true
	}
	if o["resource"] || o["api"] {
		o["controller"] = true
	}

	n := newModelNames(name)
	n.Requests, n.Policy = o["requests"], o["policy"]

	if err := writeStub("model.stub", filepath.Join("app/models", snake(n.Model)+".go"), n); err != nil {
		return err
	}
	if o["migration"] {
		n.Migration = time.Now().Format("2006_01_02_150405") + "_create_" + n.Table + "_table"
		if err := writeStub("migration.model.stub", filepath.Join("database/migrations", n.Migration+".go"), n); err != nil {
			return err
		}
	}
	if o["requests"] {
		if err := writeStub("requests.model.stub", filepath.Join("app/http/requests", snake(n.Model)+"_requests.go"), n); err != nil {
			return err
		}
	}
	if o["policy"] {
		if err := writeStub("policy.stub", filepath.Join("app/policies", snake(n.Model)+"_policy.go"), n); err != nil {
			return err
		}
	}
	if o["seed"] {
		if err := writeStub("seeder.model.stub", filepath.Join("database/seeders", snake(n.Model)+"_seeder.go"), n); err != nil {
			return err
		}
	}
	if o["controller"] {
		if o["api"] {
			if err := writeStub("controller.model.api.stub", filepath.Join("app/http/controllers/api", snake(n.Name)+".go"), n); err != nil {
				return err
			}
		} else {
			if err := writeStub("controller.model.stub", filepath.Join("app/http/controllers", snake(n.Name)+".go"), n); err != nil {
				return err
			}
			for _, page := range []string{"Index", "Show", "Create", "Edit"} {
				path := filepath.Join("resources/js/Pages", n.Pages, page+".vue")
				if err := writeStub(strings.ToLower(page)+".vue.stub", path, n); err != nil {
					return err
				}
			}
		}
	}

	fmt.Println()
	if o["migration"] {
		info("Run the migration: ./forge migrate")
	}
	if o["seed"] {
		info("Add %sSeeder{} to DatabaseSeeder in database/seeders/seeder.go", n.Model)
	}
	if o["controller"] {
		if o["api"] {
			info("Register the routes in routes/api.go:\n\n\tAPIResource(r, \"/%s\", api.New%s(db), protected)\n", n.Route, n.Name)
		} else {
			info("Register the routes in routes/web.go:\n\n\tResource(r, \"/%s\", controllers.New%s(db), auth)\n", n.Route, n.Name)
		}
	}
	return nil
}

func makeMigration(args []string) error {
	name, err := nameArg(args, "migration")
	if err != nil {
		return err
	}
	name = snake(name)
	full := time.Now().Format("2006_01_02_150405") + "_" + name
	data := map[string]string{"Name": full}

	stub := "migration.stub"
	if table, ok := strings.CutPrefix(name, "create_"); ok && strings.HasSuffix(table, "_table") {
		stub = "migration.create.stub"
		data["Table"] = strings.TrimSuffix(table, "_table")
	}
	return writeStub(stub, filepath.Join("database/migrations", full+".go"), data)
}

func makeRequest(args []string) error {
	name, err := nameArg(args, "request")
	if err != nil {
		return err
	}
	name = pascal(name)
	if !strings.HasSuffix(name, "Request") {
		name += "Request"
	}
	return writeStub("request.stub", filepath.Join("app/http/requests", snake(name)+".go"), map[string]string{"Name": name})
}

func makeMiddleware(args []string) error {
	name, err := nameArg(args, "middleware")
	if err != nil {
		return err
	}
	name = pascal(name)
	return writeStub("middleware.stub", filepath.Join("app/http/middleware", snake(name)+".go"), map[string]string{"Name": name})
}

func makeSeeder(args []string) error {
	name, err := nameArg(args, "seeder")
	if err != nil {
		return err
	}
	name = pascal(name)
	if !strings.HasSuffix(name, "Seeder") {
		name += "Seeder"
	}
	if err := writeStub("seeder.stub", filepath.Join("database/seeders", snake(name)+".go"), map[string]string{"Name": name}); err != nil {
		return err
	}
	info("Add %s{} to DatabaseSeeder in database/seeders/seeder.go", name)
	return nil
}

func makePolicy(args []string) error {
	name, err := nameArg(args, "policy")
	if err != nil {
		return err
	}
	n := newModelNames(strings.TrimSuffix(pascal(name), "Policy"))
	return writeStub("policy.stub", filepath.Join("app/policies", snake(n.Model)+"_policy.go"), n)
}

func makeTest(args []string) error {
	name, err := nameArg(args, "test")
	if err != nil {
		return err
	}
	name = strings.TrimSuffix(pascal(name), "Test")
	return writeStub("test.stub", filepath.Join("tests", snake(name)+"_test.go"), map[string]string{"Name": name})
}

func makePage(args []string) error {
	name, err := nameArg(args, "page")
	if err != nil {
		return err
	}
	name = strings.TrimSuffix(strings.Trim(name, "/"), ".vue")
	parts := strings.Split(name, "/")
	for i := range parts {
		parts[i] = pascal(parts[i])
	}
	title := strings.Join(parts, " ")
	path := filepath.Join(append([]string{"resources/js/Pages"}, parts...)...) + ".vue"
	return writeStub("page.stub", path, map[string]string{"Title": title})
}

func nameArg(args []string, kind string) (string, error) {
	pos := positional(args)
	if len(pos) == 0 {
		return "", fmt.Errorf("missing %s name", kind)
	}
	return pos[0], nil
}

func writeStub(stub, path string, data any) error {
	if _, err := os.Stat(path); err == nil {
		return fmt.Errorf("%s already exists", path)
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}

	tpl := template.New(stub)
	if strings.HasSuffix(stub, ".vue.stub") {
		tpl = tpl.Delims("[[", "]]") // Vue templates use {{ }} themselves
	}
	tpl, err := tpl.ParseFS(stubs, "stubs/"+stub)
	if err != nil {
		return err
	}
	var buf bytes.Buffer
	if err := tpl.Execute(&buf, data); err != nil {
		return err
	}
	out := buf.Bytes()
	if strings.HasSuffix(path, ".go") {
		if out, err = format.Source(out); err != nil {
			return fmt.Errorf("format %s: %w", path, err)
		}
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(path, out, 0o644); err != nil {
		return err
	}

	// A generated file that does not compile would also break ./forge
	// itself (it builds the whole app), so check it and undo on failure.
	if strings.HasSuffix(path, ".go") {
		out, err := exec.Command("go", "vet", "./"+filepath.ToSlash(filepath.Dir(path))).CombinedOutput()
		if err != nil {
			os.Remove(path)
			return fmt.Errorf("generated %s does not compile, removed it:\n%s", path, strings.TrimSpace(string(out)))
		}
	}

	done("Created %s", path)
	return nil
}

// pascal converts "blog_post" / "blog-post" / "blogPost" to "BlogPost".
func pascal(s string) string {
	var b strings.Builder
	upper := true
	for _, r := range s {
		if r == '_' || r == '-' || r == ' ' {
			upper = true
			continue
		}
		if upper {
			b.WriteRune(unicode.ToUpper(r))
			upper = false
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// words converts "BlogPost" to "Blog Post".
func words(s string) string {
	parts := strings.Split(snake(s), "_")
	for i, p := range parts {
		parts[i] = pascal(p)
	}
	return strings.Join(parts, " ")
}

// snake converts "BlogPost" to "blog_post".
func snake(s string) string {
	var b strings.Builder
	for i, r := range s {
		if unicode.IsUpper(r) {
			if i > 0 {
				b.WriteByte('_')
			}
			r = unicode.ToLower(r)
		} else if r == '-' || r == ' ' {
			r = '_'
		}
		b.WriteRune(r)
	}
	return b.String()
}

// plural is a tiny English pluralizer good enough for table/resource names.
func plural(s string) string {
	lower := strings.ToLower(s)
	switch {
	case strings.HasSuffix(lower, "y") && len(s) > 1 && !strings.ContainsRune("aeiou", rune(lower[len(lower)-2])):
		return s[:len(s)-1] + "ies"
	case strings.HasSuffix(lower, "s"), strings.HasSuffix(lower, "x"), strings.HasSuffix(lower, "ch"), strings.HasSuffix(lower, "sh"):
		return s + "es"
	}
	return s + "s"
}

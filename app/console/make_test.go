package console

import "testing"

func TestModelNames(t *testing.T) {
	n := newModelNames("blog_post")
	want := modelNames{
		Model: "BlogPost", Var: "blog post", Title: "Blog Post", Plural: "Blog Posts",
		Pages: "BlogPosts", Route: "blog-posts", Table: "blog_posts", Name: "BlogPostController",
	}
	if n != want {
		t.Fatalf("got %+v\nwant %+v", n, want)
	}
	if got := newModelNames("Category").Table; got != "categories" {
		t.Fatalf("plural: got %q", got)
	}
}

func TestOptions(t *testing.T) {
	short := map[rune]string{'m': "migration", 'c': "controller", 'r': "resource"}
	o := options([]string{"Post", "-mcr", "--api"}, short)
	for _, k := range []string{"migration", "controller", "resource", "api"} {
		if !o[k] {
			t.Errorf("expected %s to be set", k)
		}
	}
	if got := positional([]string{"Post", "-mc", "--api"}); len(got) != 1 || got[0] != "Post" {
		t.Fatalf("positional: %v", got)
	}
}

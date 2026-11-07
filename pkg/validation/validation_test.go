package validation

import "testing"

type sample struct {
	Title    *string `json:"title" validate:"omitnil,min=1,max=5"`
	Email    string  `json:"email" validate:"required,email"`
	Password string  `json:"password" validate:"required,min=8"`
	Confirm  string  `json:"password_confirmation" validate:"required,eqfield=Password"`
}

func TestValidate(t *testing.T) {
	empty := ""
	errs := Validate(&sample{Title: &empty, Email: "nope", Password: "short", Confirm: "x"})
	want := map[string]string{
		"title":                 "The title field is required.",
		"email":                 "The email field must be a valid email address.",
		"password":              "The password field must be at least 8 characters.",
		"password_confirmation": "The password confirmation field must match password.",
	}
	for k, v := range want {
		if errs[k] != v {
			t.Errorf("%s: got %q, want %q", k, errs[k], v)
		}
	}

	if errs := Validate(&sample{Email: "a@b.co", Password: "longenough", Confirm: "longenough"}); errs != nil {
		t.Fatalf("expected valid, got %v", errs)
	}
}

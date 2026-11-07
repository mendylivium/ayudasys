// Package validation wraps go-playground/validator and produces Laravel-style
// messages keyed by the JSON field name.
package validation

import (
	"errors"
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

// Errors maps a field name to its first error message.
type Errors map[string]string

func (e Errors) Error() string { return "validation failed" }

var validate = func() *validator.Validate {
	v := validator.New(validator.WithRequiredStructEnabled())
	v.RegisterTagNameFunc(func(f reflect.StructField) string {
		name, _, _ := strings.Cut(f.Tag.Get("json"), ",")
		if name == "-" {
			return ""
		}
		if name == "" {
			return f.Name
		}
		return name
	})
	return v
}()

// Validate returns nil when s is valid, otherwise the field errors.
func Validate(s any) Errors {
	err := validate.Struct(s)
	if err == nil {
		return nil
	}
	var verrs validator.ValidationErrors
	if !errors.As(err, &verrs) {
		return Errors{"_": err.Error()}
	}
	out := make(Errors, len(verrs))
	for _, fe := range verrs {
		if _, exists := out[fe.Field()]; !exists {
			out[fe.Field()] = message(fe)
		}
	}
	return out
}

func message(fe validator.FieldError) string {
	field := strings.ReplaceAll(fe.Field(), "_", " ")
	unit := ""
	if fe.Kind() == reflect.String {
		unit = " characters"
	}

	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("The %s field is required.", field)
	case "email":
		return fmt.Sprintf("The %s field must be a valid email address.", field)
	case "min":
		if fe.Param() == "1" && unit != "" {
			return fmt.Sprintf("The %s field is required.", field)
		}
		return fmt.Sprintf("The %s field must be at least %s%s.", field, fe.Param(), unit)
	case "max":
		return fmt.Sprintf("The %s field must not be greater than %s%s.", field, fe.Param(), unit)
	case "eqfield":
		return fmt.Sprintf("The %s field must match %s.", field, strings.ReplaceAll(toSnake(fe.Param()), "_", " "))
	case "oneof":
		return fmt.Sprintf("The selected %s is invalid.", field)
	}
	return fmt.Sprintf("The %s field is invalid.", field)
}

func toSnake(s string) string {
	var b strings.Builder
	for i, r := range s {
		if i > 0 && r >= 'A' && r <= 'Z' {
			b.WriteByte('_')
		}
		b.WriteRune(r)
	}
	return strings.ToLower(b.String())
}

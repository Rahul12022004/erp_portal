package validate

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

var v = validator.New()

// Struct validates a struct using `validate` tags.
// Returns a human-readable error string or nil.
func Struct(s interface{}) error {
	if err := v.Struct(s); err != nil {
		var errs validator.ValidationErrors
		if !strings.Contains(err.Error(), "Key:") {
			return err
		}
		_ = errs
		msgs := make([]string, 0)
		for _, fe := range err.(validator.ValidationErrors) {
			msgs = append(msgs, fmt.Sprintf("field '%s' failed '%s'", fe.Field(), fe.Tag()))
		}
		return fmt.Errorf("%s", strings.Join(msgs, "; "))
	}
	return nil
}

package apperr

import "fmt"

// Code represents a typed error category.
type Code string

const (
	CodeNotFound      Code = "NOT_FOUND"
	CodeUnauthorized  Code = "UNAUTHORIZED"
	CodeForbidden     Code = "FORBIDDEN"
	CodeBadRequest    Code = "BAD_REQUEST"
	CodeConflict      Code = "CONFLICT"
	CodeInternal      Code = "INTERNAL"
	CodeTooManyReqs   Code = "TOO_MANY_REQUESTS"
)

// AppError is a domain-level error with HTTP semantics.
type AppError struct {
	Code    Code
	Message string
}

func (e *AppError) Error() string { return fmt.Sprintf("[%s] %s", e.Code, e.Message) }

func New(code Code, msg string) *AppError { return &AppError{Code: code, Message: msg} }

func NotFound(msg string) *AppError      { return New(CodeNotFound, msg) }
func Unauthorized(msg string) *AppError  { return New(CodeUnauthorized, msg) }
func Forbidden(msg string) *AppError     { return New(CodeForbidden, msg) }
func BadRequest(msg string) *AppError    { return New(CodeBadRequest, msg) }
func Conflict(msg string) *AppError      { return New(CodeConflict, msg) }
func Internal(msg string) *AppError      { return New(CodeInternal, msg) }
func TooManyReqs(msg string) *AppError   { return New(CodeTooManyReqs, msg) }

// HTTP returns the appropriate HTTP status for the error code.
func HTTP(code Code) int {
	switch code {
	case CodeNotFound:
		return 404
	case CodeUnauthorized:
		return 401
	case CodeForbidden:
		return 403
	case CodeBadRequest:
		return 400
	case CodeConflict:
		return 409
	case CodeTooManyReqs:
		return 429
	default:
		return 500
	}
}

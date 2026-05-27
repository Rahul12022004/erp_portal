package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/erp-portal/go-backend/pkg/response"
)

// RequireRole returns middleware that allows only the listed roles.
func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *fiber.Ctx) error {
		claims := GetClaims(c)
		if claims == nil {
			return response.Unauthorized(c, "not authenticated")
		}
		if _, ok := allowed[claims.Role]; !ok {
			return response.Forbidden(c, "insufficient permissions")
		}
		return c.Next()
	}
}

// SuperAdmin shortcut.
func SuperAdmin() fiber.Handler { return RequireRole("super-admin") }

// SchoolAdmin shortcut.
func SchoolAdmin() fiber.Handler { return RequireRole("school-admin") }

// SchoolOrSuper allows both admin roles.
func SchoolOrSuper() fiber.Handler { return RequireRole("school-admin", "super-admin") }

// Teacher shortcut.
func Teacher() fiber.Handler { return RequireRole("teacher") }

// AnyStaff allows school-admin or teacher.
func AnyStaff() fiber.Handler { return RequireRole("school-admin", "teacher") }

package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/config"
	"github.com/erp-portal/go-backend/pkg/jwtutil"
	"github.com/erp-portal/go-backend/pkg/response"
)

// CtxUser is the Locals key for the parsed JWT claims.
const CtxUser = "user"

// Authenticate validates the Bearer token and injects claims into Locals.
func Authenticate(c *fiber.Ctx) error {
	header := c.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return response.Unauthorized(c, "missing or malformed authorization header")
	}
	tokenStr := strings.TrimPrefix(header, "Bearer ")
	claims, err := jwtutil.Verify(config.C.JWTSecret, tokenStr)
	if err != nil {
		return response.Unauthorized(c, "invalid or expired token")
	}
	c.Locals(CtxUser, claims)
	return c.Next()
}

// GetClaims retrieves JWT claims from the Fiber context.
func GetClaims(c *fiber.Ctx) *jwtutil.Claims {
	claims, _ := c.Locals(CtxUser).(*jwtutil.Claims)
	return claims
}

package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/erp-portal/go-backend/internal/core/logger"
)

// RequestLogger logs every request with method, path, status and latency.
func RequestLogger(c *fiber.Ctx) error {
	start := time.Now()
	reqID := uuid.NewString()
	c.Set("X-Request-ID", reqID)

	err := c.Next()

	logger.Log.Info().
		Str("reqId", reqID).
		Str("method", c.Method()).
		Str("path", c.Path()).
		Int("status", c.Response().StatusCode()).
		Dur("latency", time.Since(start)).
		Msg("request")

	return err
}

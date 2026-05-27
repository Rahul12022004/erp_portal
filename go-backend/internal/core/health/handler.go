package health

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/erp-portal/go-backend/internal/core/db"
)

type status struct {
	OK       bool   `json:"ok"`
	Status   string `json:"status"`
	Database dbInfo `json:"database"`
}

type dbInfo struct {
	Connected bool   `json:"connected"`
	Error     string `json:"error,omitempty"`
}

// Register mounts /api/health on the given Fiber app.
func Register(app *fiber.App) {
	app.Get("/api/health", func(c *fiber.Ctx) error {
		info := dbInfo{Connected: true}
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		if db.Client == nil {
			info.Connected = false
			info.Error = "not initialised"
		} else if err := db.Client.Ping(ctx, nil); err != nil {
			info.Connected = false
			info.Error = err.Error()
		}

		s := status{
			OK:       info.Connected,
			Status:   "healthy",
			Database: info,
		}
		if !info.Connected {
			s.Status = "degraded"
			return c.Status(207).JSON(s)
		}
		return c.JSON(s)
	})
}

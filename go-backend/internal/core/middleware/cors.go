package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/erp-portal/go-backend/internal/core/config"
)

// CORS builds Fiber CORS middleware from the loaded config.
func CORS() fiber.Handler {
	origins := append([]string{
		"http://localhost:5173",
		"http://localhost:5174",
		"http://localhost:8080",
		"http://localhost:8081",
	}, config.C.FrontendOrigins...)

	allow := ""
	for i, o := range origins {
		if i > 0 {
			allow += ","
		}
		allow += o
	}

	return cors.New(cors.Config{
		AllowOrigins:     allow,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Authorization,X-Request-ID",
		AllowCredentials: true,
	})
}

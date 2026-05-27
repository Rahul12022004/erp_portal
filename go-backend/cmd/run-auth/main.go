package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/erp-portal/go-backend/internal/core/config"
	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/health"
	"github.com/erp-portal/go-backend/internal/core/logger"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	authRoutes "github.com/erp-portal/go-backend/internal/modules/auth/routes"
	schoolRoutes "github.com/erp-portal/go-backend/internal/modules/school/routes"
)

func main() {
	config.Load()
	logger.Init(config.C.LogLevel, config.C.Env)

	if err := db.Connect(config.C.MongoURI, config.C.MongoDB); err != nil {
		logger.Fatal().Err(err).Msg("mongo connect failed")
		os.Exit(1)
	}
	defer db.Disconnect()

	app := fiber.New()
	app.Use(recover.New())
	app.Use(middleware.CORS())
	app.Use(middleware.RequestLogger)
	health.Register(app)
	authRoutes.Register(app)
	schoolRoutes.Register(app)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		addr := fmt.Sprintf(":%d", config.C.Port)
		logger.Info().Str("addr", addr).Msg("auth server starting")
		if err := app.Listen(addr); err != nil {
			logger.Fatal().Err(err).Msg("listen failed")
		}
	}()

	<-quit
	_ = app.Shutdown()
}

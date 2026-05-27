package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/erp-portal/go-backend/app"
	"github.com/erp-portal/go-backend/internal/core/config"
	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/logger"
)

func main() {
	config.Load()
	logger.Init(config.C.LogLevel, config.C.Env)

	if err := config.Validate(); err != nil {
		fmt.Fprintf(os.Stderr, "startup error: %v\n", err)
		os.Exit(1)
	}

	if err := db.Connect(config.C.MongoURI, config.C.MongoDB); err != nil {
		logger.Fatal().Err(err).Msg("mongo connect failed")
		os.Exit(1)
	}
	defer db.Disconnect()

	fiberApp := app.New()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		addr := fmt.Sprintf(":%d", config.C.Port)
		logger.Info().Str("addr", addr).Msg("server starting")
		if err := fiberApp.Listen(addr); err != nil {
			logger.Fatal().Err(err).Msg("listen failed")
		}
	}()

	<-quit
	logger.Info().Msg("shutting down")
	if err := fiberApp.Shutdown(); err != nil {
		logger.Error().Err(err).Msg("shutdown error")
	}
}

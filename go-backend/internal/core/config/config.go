package config

import (
	"errors"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all application configuration.
type Config struct {
	Env  string
	Port int

	MongoURI string
	MongoDB  string

	JWTSecret  string
	JWTExpires time.Duration

	SMTP struct {
		Host     string
		Port     int
		User     string
		Password string
		From     string
	}

	LogLevel    string
	SeedLocal   bool
	FrontendOrigins []string

	SuperAdminEmail    string
	SuperAdminPassword string
}

var C Config

// Load reads config from environment (with .env fallback via viper).
func Load() {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")
	viper.AutomaticEnv()
	_ = viper.ReadInConfig() // ignore missing .env in prod

	C.Env = str("NODE_ENV", "development")
	C.Port = viper.GetInt("PORT")
	if C.Port == 0 {
		C.Port = 5000
	}

	C.MongoURI = str("MONGO_URI", "")
	// Support both MONGO_DB and MONGO_DATABASE as env var names
	C.MongoDB = str("MONGO_DB", str("MONGO_DATABASE", "erp_portal"))

	C.JWTSecret = str("JWT_SECRET", "changeme-in-production")
	ttlStr := str("JWT_EXPIRES_IN", "12h")
	if d, err := time.ParseDuration(ttlStr); err == nil {
		C.JWTExpires = d
	} else {
		C.JWTExpires = 12 * time.Hour
	}

	C.SMTP.Host = str("SMTP_HOST", "")
	C.SMTP.Port = viper.GetInt("SMTP_PORT")
	if C.SMTP.Port == 0 {
		C.SMTP.Port = 587
	}
	C.SMTP.User = str("SMTP_USER", "")
	C.SMTP.Password = str("SMTP_PASS", "")
	C.SMTP.From = str("SMTP_FROM", C.SMTP.User)

	C.LogLevel = str("LOG_LEVEL", "info")
	C.SeedLocal = viper.GetBool("SEED_LOCAL_DATA")

	origins := str("FRONTEND_ORIGINS", "")
	if origins != "" {
		C.FrontendOrigins = strings.Split(origins, ",")
	}

	C.SuperAdminEmail = str("SUPER_ADMIN_EMAIL", "")
	C.SuperAdminPassword = str("SUPER_ADMIN_PASSWORD", "")
}

// Validate checks required config values and returns an error if any are missing.
func Validate() error {
	if C.MongoURI == "" {
		return errors.New("MONGO_URI is required — set it in .env or environment (Atlas: mongodb+srv://...)")
	}
	return nil
}

func str(key, def string) string {
	if v := viper.GetString(key); v != "" {
		return v
	}
	return def
}

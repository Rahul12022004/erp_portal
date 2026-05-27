package email

import (
	"fmt"
	"net/smtp"
	"strings"
)

// Config holds SMTP credentials.
type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

// Send dispatches a single HTML email.
func Send(cfg Config, to []string, subject, htmlBody string) error {
	if cfg.Host == "" {
		return fmt.Errorf("SMTP host not configured")
	}
	auth := smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)
	headers := strings.Join([]string{
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=\"UTF-8\"",
		fmt.Sprintf("From: %s", cfg.From),
		fmt.Sprintf("To: %s", strings.Join(to, ", ")),
		fmt.Sprintf("Subject: %s", subject),
	}, "\r\n")
	msg := []byte(headers + "\r\n\r\n" + htmlBody)
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	return smtp.SendMail(addr, auth, cfg.From, to, msg)
}

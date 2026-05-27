package response

import "github.com/gofiber/fiber/v2"

// R is the standard envelope for every API response.
type R struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func OK(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(R{Success: true, Data: data})
}

func Created(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(R{Success: true, Data: data})
}

func NoContent(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

func Accepted(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusAccepted).JSON(R{Success: true, Data: data})
}

func Msg(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusOK).JSON(R{Success: true, Message: message})
}

func BadRequest(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusBadRequest).JSON(R{Success: false, Error: msg})
}

func Unauthorized(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(R{Success: false, Error: msg})
}

func Forbidden(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusForbidden).JSON(R{Success: false, Error: msg})
}

func NotFound(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusNotFound).JSON(R{Success: false, Error: msg})
}

func Conflict(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusConflict).JSON(R{Success: false, Error: msg})
}

func TooManyRequests(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusTooManyRequests).JSON(R{Success: false, Error: msg})
}

func InternalError(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusInternalServerError).JSON(R{Success: false, Error: msg})
}

func ServiceUnavailable(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusServiceUnavailable).JSON(R{Success: false, Error: msg})
}

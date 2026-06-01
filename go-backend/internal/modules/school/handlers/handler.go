package handlers

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/school/dto"
	"github.com/erp-portal/go-backend/internal/modules/school/services"
	"github.com/erp-portal/go-backend/pkg/auditlog"
	"github.com/erp-portal/go-backend/pkg/response"
	"github.com/erp-portal/go-backend/pkg/validate"
)

// SchoolHandler handles HTTP for the school module.
type SchoolHandler struct {
	svc  *services.SchoolService
	logs *mongo.Collection
}

func New(svc *services.SchoolService, logsCol *mongo.Collection) *SchoolHandler {
	return &SchoolHandler{svc: svc, logs: logsCol}
}

func (h *SchoolHandler) actor(c *fiber.Ctx) string {
	if claims := middleware.GetClaims(c); claims != nil {
		return claims.Email
	}
	return "unknown"
}

// toSession converts a School domain to the wire response shape.
func (h *SchoolHandler) toSession(s interface{}) interface{} { return s }

// GetByID  GET /api/schools/:id
func (h *SchoolHandler) GetByID(c *fiber.Ctx) error {
	school, err := h.svc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, toSessionResp(school))
}

// Register  POST /api/schools/register  (public — self-service signup)
func (h *SchoolHandler) Register(c *fiber.Ctx) error {
	var req dto.CreateSchoolReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}
	plainPass := req.AdminPassword
	if plainPass == "" {
		plainPass = fmt.Sprintf("Pass%d!", time.Now().UnixMilli()%100000)
		req.AdminPassword = plainPass
	}
	school, err := h.svc.Create(c.Context(), req)
	if err != nil {
		return response.Conflict(c, err.Error())
	}
	return response.Created(c, fiber.Map{
		"school":        toSessionResp(school),
		"adminPassword": plainPass,
	})
}

// Create  POST /api/schools
func (h *SchoolHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateSchoolReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}
	school, err := h.svc.Create(c.Context(), req)
	if err != nil {
		return response.Conflict(c, err.Error())
	}
	auditlog.Write(h.logs, "school.create", fmt.Sprintf("School '%s' created (admin: %s)", req.SchoolName, req.AdminEmail), h.actor(c))
	return response.Created(c, toSessionResp(school))
}

// Update  PUT /api/schools/:id
func (h *SchoolHandler) Update(c *fiber.Ctx) error {
	var req dto.UpdateSchoolReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	school, err := h.svc.Update(c.Context(), c.Params("id"), req)
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	auditlog.Write(h.logs, "school.update", fmt.Sprintf("School %s updated", c.Params("id")), h.actor(c))
	return response.OK(c, toSessionResp(school))
}

// List  GET /api/schools
func (h *SchoolHandler) List(c *fiber.Ctx) error {
	schools, total, err := h.svc.List(c.Context(), 0, 100)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, fiber.Map{"schools": schools, "total": total})
}

// Delete  DELETE /api/schools/:id
func (h *SchoolHandler) Delete(c *fiber.Ctx) error {
	if err := h.svc.Delete(c.Context(), c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	auditlog.Write(h.logs, "school.delete", fmt.Sprintf("School %s deleted", c.Params("id")), h.actor(c))
	return response.NoContent(c)
}

// Toggle  PUT /api/schools/toggle/:id
func (h *SchoolHandler) Toggle(c *fiber.Ctx) error {
	school, err := h.svc.ToggleStatus(c.Context(), c.Params("id"))
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	auditlog.Write(h.logs, "school.toggle", fmt.Sprintf("School %s status toggled to %s", c.Params("id"), school.AdminInfo.Status), h.actor(c))
	return response.OK(c, toSessionResp(school))
}

// parsePlan extracts "plan" from JSON body, falling back to query param.
func parsePlan(c *fiber.Ctx) string {
	// Try BodyParser first
	var body struct {
		Plan string `json:"plan"`
	}
	c.BodyParser(&body)
	if body.Plan != "" {
		return body.Plan
	}
	// Fall back to raw JSON decode (handles cases where BodyParser misses Content-Type)
	raw := c.Body()
	if len(raw) > 0 {
		var m map[string]string
		if json.Unmarshal(raw, &m) == nil && m["plan"] != "" {
			return m["plan"]
		}
	}
	// Query param fallback
	return c.Query("plan")
}

// Upgrade  PUT /api/schools/upgrade/:id
func (h *SchoolHandler) Upgrade(c *fiber.Ctx) error {
	plan := parsePlan(c)
	if plan == "" {
		return response.BadRequest(c, "plan is required")
	}
	school, err := h.svc.UpgradeSubscription(c.Context(), c.Params("id"), plan)
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	auditlog.Write(h.logs, "subscription.upgrade", fmt.Sprintf("School %s upgraded to %s plan", c.Params("id"), plan), h.actor(c))
	return response.OK(c, toSessionResp(school))
}

// Renew  PUT /api/schools/renew/:id
func (h *SchoolHandler) Renew(c *fiber.Ctx) error {
	plan := parsePlan(c)
	school, err := h.svc.RenewSubscription(c.Context(), c.Params("id"), plan)
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	auditlog.Write(h.logs, "subscription.renew", fmt.Sprintf("School %s subscription renewed (plan: %s)", c.Params("id"), school.SystemInfo.SubscriptionPlan), h.actor(c))
	return response.OK(c, toSessionResp(school))
}

// UpdateLocation  PUT /api/schools/:id/location
func (h *SchoolHandler) UpdateLocation(c *fiber.Ctx) error {
	var body struct {
		Latitude     float64 `json:"latitude"`
		Longitude    float64 `json:"longitude"`
		RadiusMeters float64 `json:"radiusMeters"`
	}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	school, err := h.svc.UpdateLocation(c.Context(), c.Params("id"), body.Latitude, body.Longitude, body.RadiusMeters)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, toSessionResp(school))
}

// UpdateLocationLock  PATCH /api/schools/:id/location-lock
func (h *SchoolHandler) UpdateLocationLock(c *fiber.Ctx) error {
	var body struct {
		Locked bool `json:"locked"`
	}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	school, err := h.svc.UpdateLocationLock(c.Context(), c.Params("id"), body.Locked)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, toSessionResp(school))
}

func toSessionResp(s interface{}) interface{} {
	// Keep the domain struct — JSON tags are clean enough for the wire.
	return s
}

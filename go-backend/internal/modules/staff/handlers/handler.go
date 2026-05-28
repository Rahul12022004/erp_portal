package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/erp-portal/go-backend/internal/modules/staff/services"
	"github.com/erp-portal/go-backend/pkg/response"
	"github.com/erp-portal/go-backend/pkg/validate"
)

type Handler struct {
	staffSvc *services.StaffService
	leaveSvc *services.LeaveService
	rolesCol *mongo.Collection
}

func New(ss *services.StaffService, ls *services.LeaveService, rolesCol *mongo.Collection) *Handler {
	return &Handler{staffSvc: ss, leaveSvc: ls, rolesCol: rolesCol}
}

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

// GET /api/staff/:schoolId
func (h *Handler) ListBySchool(c *fiber.Ctx) error {
	list, err := h.staffSvc.ListBySchool(c.Context(), c.Params("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// GET /api/staff/member/:id
func (h *Handler) GetByID(c *fiber.Ctx) error {
	s, err := h.staffSvc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, s)
}

// POST /api/staff
func (h *Handler) Create(c *fiber.Ctx) error {
	var req services.CreateStaffReq
	raw := c.Body()
	if len(raw) == 0 {
		return response.BadRequest(c, "empty body — no data received by server")
	}
	if err := json.Unmarshal(raw, &req); err != nil {
		return response.BadRequest(c, fmt.Sprintf("parse error: %s", err.Error()))
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}
	s, err := h.staffSvc.Create(c.Context(), req)
	if err != nil {
		return response.Conflict(c, err.Error())
	}
	return response.Created(c, s)
}

// PUT /api/staff/:id
func (h *Handler) Update(c *fiber.Ctx) error {
	var updates map[string]interface{}
	if err := json.Unmarshal(c.Body(), &updates); err != nil {
		return response.BadRequest(c, fmt.Sprintf("parse error: %s", err.Error()))
	}
	delete(updates, "password")
	s, err := h.staffSvc.Update(c.Context(), c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, s)
}

// DELETE /api/staff/:id
func (h *Handler) Delete(c *fiber.Ctx) error {
	if err := h.staffSvc.Delete(c.Context(), c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// GET /api/leaves/school/:schoolId
func (h *Handler) ListLeavesBySchool(c *fiber.Ctx) error {
	list, err := h.leaveSvc.ListBySchool(c.Context(), c.Params("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// GET /api/leaves/:schoolId/:teacherId
func (h *Handler) ListLeavesByTeacher(c *fiber.Ctx) error {
	list, err := h.leaveSvc.ListByTeacher(c.Context(), c.Params("schoolId"), c.Params("teacherId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/leaves
func (h *Handler) CreateLeave(c *fiber.Ctx) error {
	var req services.CreateLeaveReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}
	leave, err := h.leaveSvc.Create(c.Context(), req)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, leave)
}

// PATCH /api/leaves/:id/status
func (h *Handler) UpdateLeaveStatus(c *fiber.Ctx) error {
	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	leave, err := h.leaveSvc.UpdateStatus(c.Context(), c.Params("id"), body.Status)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"success": true, "data": leave})
}

// ─── Teacher Roles ────────────────────────────────────────────────────────────

// GET /api/teacher-roles/:schoolId
func (h *Handler) ListTeacherRoles(c *fiber.Ctx) error {
	sid, _ := primitive.ObjectIDFromHex(c.Params("schoolId"))
	ctx, cancel := ctx10s()
	defer cancel()
	cur, err := h.rolesCol.Find(ctx, bson.M{"schoolId": sid})
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer cur.Close(ctx)
	var list []bson.M
	if err := cur.All(ctx, &list); err != nil {
		return response.InternalError(c, err.Error())
	}
	if list == nil {
		list = []bson.M{}
	}
	return response.OK(c, list)
}

// POST /api/teacher-roles
func (h *Handler) CreateTeacherRole(c *fiber.Ctx) error {
	var body struct {
		SchoolID          string   `json:"schoolId"`
		TeacherID         string   `json:"teacherId"`
		RoleName          string   `json:"roleName"`
		Modules           []string `json:"modules"`
		GeneratedPassword string   `json:"generatedPassword"`
		CreatedBy         string   `json:"createdBy"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	sid, _ := primitive.ObjectIDFromHex(body.SchoolID)
	tid, _ := primitive.ObjectIDFromHex(body.TeacherID)
	now := time.Now()
	doc := bson.M{
		"_id":               primitive.NewObjectID(),
		"schoolId":          sid,
		"teacherId":         tid,
		"roleName":          body.RoleName,
		"modules":           body.Modules,
		"generatedPassword": body.GeneratedPassword,
		"createdBy":         body.CreatedBy,
		"createdAt":         now,
		"updatedAt":         now,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	if _, err := h.rolesCol.InsertOne(ctx, doc); err != nil {
		return response.InternalError(c, err.Error())
	}
	// Fetch teacher email for response
	teacherEmail := ""
	if body.TeacherID != "" {
		var staff bson.M
		if err := h.rolesCol.Database().Collection("staff").FindOne(ctx, bson.M{"_id": tid}).Decode(&staff); err == nil {
			if e, ok := staff["email"].(string); ok {
				teacherEmail = e
			}
			doc["teacherEmail"] = teacherEmail
			doc["teacherId"] = staff
		}
	}
	return response.Created(c, doc)
}

// DELETE /api/teacher-roles/:id
func (h *Handler) DeleteTeacherRole(c *fiber.Ctx) error {
	oid, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "invalid id")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	if _, err := h.rolesCol.DeleteOne(ctx, bson.M{"_id": oid}); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, fiber.Map{"deleted": true})
}

// POST /api/teacher-roles/login
func (h *Handler) TeacherRoleLogin(c *fiber.Ctx) error {
	var body struct {
		SchoolID          string `json:"schoolId"`
		TeacherEmail      string `json:"teacherEmail"`
		GeneratedPassword string `json:"generatedPassword"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	sid, _ := primitive.ObjectIDFromHex(body.SchoolID)
	ctx, cancel := ctx10s()
	defer cancel()

	// Find staff by email
	var staff bson.M
	if err := h.rolesCol.Database().Collection("staff").FindOne(ctx, bson.M{
		"schoolId": sid, "email": body.TeacherEmail,
	}).Decode(&staff); err != nil {
		return response.Unauthorized(c, "invalid credentials")
	}
	staffID, _ := staff["_id"].(primitive.ObjectID)

	// Find teacher role card matching teacher + password
	var roleDoc bson.M
	if err := h.rolesCol.FindOne(ctx, bson.M{
		"schoolId":          sid,
		"teacherId":         staffID,
		"generatedPassword": body.GeneratedPassword,
	}).Decode(&roleDoc); err != nil {
		return response.Unauthorized(c, "invalid credentials")
	}
	return response.OK(c, fiber.Map{"role": roleDoc, "staff": staff})
}

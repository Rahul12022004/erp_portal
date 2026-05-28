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
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/settings/domain"
	"github.com/erp-portal/go-backend/internal/modules/settings/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct {
	repo      *repositories.SettingsRepo
	logsCol   *mongo.Collection
	globalCol *mongo.Collection
}

func New(r *repositories.SettingsRepo) *Handler { return &Handler{repo: r} }

func NewWithLogs(r *repositories.SettingsRepo, logsCol *mongo.Collection, globalCol *mongo.Collection) *Handler {
	return &Handler{repo: r, logsCol: logsCol, globalCol: globalCol}
}

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (h *Handler) Get(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	s, err := h.repo.FindBySchool(ctx, c.Query("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if s == nil {
		return response.OK(c, &domain.Settings{})
	}
	return response.OK(c, s)
}

func (h *Handler) Upsert(c *fiber.Ctx) error {
	var s domain.Settings
	if err := c.BodyParser(&s); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	saved, err := h.repo.Upsert(ctx, &s)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, saved)
}

// GET /api/settings/general — any authenticated user (announcement banner needs it)
func (h *Handler) GetGeneral(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	var doc bson.M
	err := h.globalCol.FindOne(ctx, bson.M{"_id": "config"}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return response.OK(c, domain.DefaultGeneralConfig())
	}
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	cfg := generalFromBSON(doc)
	cfg.SMTPPassword = "" // never expose password to client
	return response.OK(c, cfg)
}

// PUT /api/admin/config — super-admin only
func (h *Handler) PutGeneral(c *fiber.Ctx) error {
	raw := c.Body()
	if len(raw) == 0 {
		return response.BadRequest(c, "empty body received")
	}
	var body domain.GeneralConfig
	if err := json.Unmarshal(raw, &body); err != nil {
		return response.BadRequest(c, fmt.Sprintf("parse error (%d bytes): %s", len(raw), err.Error()))
	}
	ctx, cancel := ctx10s()
	defer cancel()

	setFields := bson.M{
		"appName":                 body.AppName,
		"logoUrl":                 body.LogoURL,
		"currencySymbol":          body.CurrencySymbol,
		"academicYear":            body.AcademicYear,
		"supportEmail":            body.SupportEmail,
		"supportPhone":            body.SupportPhone,
		"allowSelfRegistration":   body.AllowSelfRegistration,
		"defaultPlan":             body.DefaultPlan,
		"maxSchools":              body.MaxSchools,
		"sessionTimeoutMinutes":   body.SessionTimeoutMinutes,
		"maxLoginAttempts":        body.MaxLoginAttempts,
		"require2FAAdmin":         body.Require2FAAdmin,
		"require2FASchool":        body.Require2FASchool,
		"smtpHost":                body.SMTPHost,
		"smtpPort":                body.SMTPPort,
		"smtpUsername":            body.SMTPUsername,
		"smtpFromName":            body.SMTPFromName,
		"smtpFromEmail":           body.SMTPFromEmail,
		"announcementEnabled":     body.AnnouncementEnabled,
		"announcementMessage":     body.AnnouncementMessage,
		"announcementType":        body.AnnouncementType,
		"announcementTarget":      body.AnnouncementTarget,
		"minPasswordLength":       body.MinPasswordLength,
		"requireUppercase":        body.RequireUppercase,
		"requireNumber":           body.RequireNumber,
		"requireSpecialChar":      body.RequireSpecialChar,
		"passwordExpiryDays":      body.PasswordExpiryDays,
		"maxUploadSizeMB":         body.MaxUploadSizeMB,
		"storageQuotaPerSchoolMB": body.StorageQuotaPerSchoolMB,
		"updatedAt":               time.Now(),
	}
	// Only overwrite SMTP password if a new one was provided
	if body.SMTPPassword != "" {
		setFields["smtpPassword"] = body.SMTPPassword
	}

	opts := options.Update().SetUpsert(true)
	if _, err := h.globalCol.UpdateOne(ctx,
		bson.M{"_id": "config"},
		bson.M{"$set": setFields},
		opts,
	); err != nil {
		return response.InternalError(c, err.Error())
	}
	body.SMTPPassword = ""
	return response.OK(c, body)
}

func generalFromBSON(d bson.M) *domain.GeneralConfig {
	cfg := domain.DefaultGeneralConfig()
	if v, ok := d["appName"].(string); ok { cfg.AppName = v }
	if v, ok := d["logoUrl"].(string); ok { cfg.LogoURL = v }
	if v, ok := d["currencySymbol"].(string); ok { cfg.CurrencySymbol = v }
	if v, ok := d["academicYear"].(string); ok { cfg.AcademicYear = v }
	if v, ok := d["supportEmail"].(string); ok { cfg.SupportEmail = v }
	if v, ok := d["supportPhone"].(string); ok { cfg.SupportPhone = v }
	if v, ok := d["allowSelfRegistration"].(bool); ok { cfg.AllowSelfRegistration = v }
	if v, ok := d["defaultPlan"].(string); ok { cfg.DefaultPlan = v }
	if v, ok := d["maxSchools"].(int32); ok { cfg.MaxSchools = int(v) }
	if v, ok := d["sessionTimeoutMinutes"].(int32); ok { cfg.SessionTimeoutMinutes = int(v) }
	if v, ok := d["maxLoginAttempts"].(int32); ok { cfg.MaxLoginAttempts = int(v) }
	if v, ok := d["require2FAAdmin"].(bool); ok { cfg.Require2FAAdmin = v }
	if v, ok := d["require2FASchool"].(bool); ok { cfg.Require2FASchool = v }
	if v, ok := d["smtpHost"].(string); ok { cfg.SMTPHost = v }
	if v, ok := d["smtpPort"].(int32); ok { cfg.SMTPPort = int(v) }
	if v, ok := d["smtpUsername"].(string); ok { cfg.SMTPUsername = v }
	if v, ok := d["smtpPassword"].(string); ok { cfg.SMTPPassword = v }
	if v, ok := d["smtpFromName"].(string); ok { cfg.SMTPFromName = v }
	if v, ok := d["smtpFromEmail"].(string); ok { cfg.SMTPFromEmail = v }
	if v, ok := d["announcementEnabled"].(bool); ok { cfg.AnnouncementEnabled = v }
	if v, ok := d["announcementMessage"].(string); ok { cfg.AnnouncementMessage = v }
	if v, ok := d["announcementType"].(string); ok { cfg.AnnouncementType = v }
	if v, ok := d["announcementTarget"].(string); ok { cfg.AnnouncementTarget = v }
	if v, ok := d["minPasswordLength"].(int32); ok { cfg.MinPasswordLength = int(v) }
	if v, ok := d["requireUppercase"].(bool); ok { cfg.RequireUppercase = v }
	if v, ok := d["requireNumber"].(bool); ok { cfg.RequireNumber = v }
	if v, ok := d["requireSpecialChar"].(bool); ok { cfg.RequireSpecialChar = v }
	if v, ok := d["passwordExpiryDays"].(int32); ok { cfg.PasswordExpiryDays = int(v) }
	if v, ok := d["maxUploadSizeMB"].(int32); ok { cfg.MaxUploadSizeMB = int(v) }
	if v, ok := d["storageQuotaPerSchoolMB"].(int32); ok { cfg.StorageQuotaPerSchoolMB = int(v) }
	return cfg
}

// GET /api/settings/global-modules — returns map of module key → enabled bool
func (h *Handler) GetGlobalModules(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	var doc bson.M
	err := h.globalCol.FindOne(ctx, bson.M{"_id": "global"}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return response.OK(c, fiber.Map{"modules": fiber.Map{}})
	}
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	modules := make(map[string]bool)
	if mods, ok := doc["modules"].(bson.M); ok {
		for k, v := range mods {
			if bv, ok := v.(bool); ok {
				modules[k] = bv
			}
		}
	}
	return response.OK(c, fiber.Map{"modules": modules})
}

// PUT /api/settings/global-modules — super-admin persists module toggle map
func (h *Handler) PutGlobalModules(c *fiber.Ctx) error {
	var body struct {
		Modules map[string]bool `json:"modules"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	update := bson.M{"$set": bson.M{"modules": body.Modules, "updatedAt": time.Now()}}
	var result bson.M
	if err := h.globalCol.FindOneAndUpdate(ctx, bson.M{"_id": "global"}, update, opts).Decode(&result); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, fiber.Map{"modules": body.Modules})
}

// GET /api/logs?schoolId=&limit=&skip=
func (h *Handler) ListLogs(c *fiber.Ctx) error {
	if h.logsCol == nil {
		return response.OK(c, []interface{}{})
	}
	ctx, cancel := ctx10s()
	defer cancel()

	filter := bson.M{}
	if sid := c.Query("schoolId"); sid != "" {
		oid, _ := primitive.ObjectIDFromHex(sid)
		filter["schoolId"] = oid
	}
	limit := int64(50)
	if l := c.QueryInt("limit", 50); l > 0 {
		limit = int64(l)
	}
	skip := int64(c.QueryInt("skip", 0))

	opts := options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(limit).SetSkip(skip)
	cur, err := h.logsCol.Find(ctx, filter, opts)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer cur.Close(ctx)
	var logs []bson.M
	if err := cur.All(ctx, &logs); err != nil {
		return response.InternalError(c, err.Error())
	}
	if logs == nil {
		logs = []bson.M{}
	}
	return response.OK(c, logs)
}

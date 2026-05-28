package handlers

import (
	"context"
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
	repo    *repositories.SettingsRepo
	logsCol *mongo.Collection
}

func New(r *repositories.SettingsRepo) *Handler { return &Handler{repo: r} }

func NewWithLogs(r *repositories.SettingsRepo, logsCol *mongo.Collection) *Handler {
	return &Handler{repo: r, logsCol: logsCol}
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

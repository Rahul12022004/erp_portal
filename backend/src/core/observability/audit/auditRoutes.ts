/**
 * GET /api/audit/school/:schoolId          - recent audit log for a school (paginated)
 * GET /api/audit/entity/:type/:id          - history for a specific entity
 */
import { Router } from "express";
import { getSchoolAuditLog, getEntityHistory } from "./auditService";

export const auditRouter = Router();

auditRouter.get("/school/:schoolId", async (req, res, next) => {
  try {
    const { schoolId } = req.params;
    const { module, action, limit, offset } = req.query as Record<string, string | undefined>;
    const result = await getSchoolAuditLog(schoolId, {
      module,
      action,
      limit:  limit  ? Number(limit)  : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json(result);
  } catch (err) { next(err); }
});

auditRouter.get("/entity/:type/:id", async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const history = await getEntityHistory(type, id, limit);
    res.json({ items: history, count: history.length });
  } catch (err) { next(err); }
});

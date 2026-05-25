import { eventBus } from "../../../core/events";
import Log from "../models/Logs";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Log.deleteMany({ schoolId: String(schoolId) });
});

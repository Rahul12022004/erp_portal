import { eventBus } from "../../../core/events";
import Survey from "../models/Survey";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Survey.deleteMany({ schoolId });
});

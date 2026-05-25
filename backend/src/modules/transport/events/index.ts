import { eventBus } from "../../../core/events";
import Transport from "../models/Transport";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Transport.deleteMany({ schoolId });
});

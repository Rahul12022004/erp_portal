import { eventBus } from "../../../core/events";
import Maintenance from "../models/Maintenance";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Maintenance.deleteMany({ schoolId });
});

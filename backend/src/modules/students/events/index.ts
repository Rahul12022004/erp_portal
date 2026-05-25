import { eventBus } from "../../../core/events";
import Student from "../models/Student";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Student.deleteMany({ schoolId });
});

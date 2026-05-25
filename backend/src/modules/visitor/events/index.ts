import { eventBus } from "../../../core/events";
import Visitor from "../models/Visitor";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Visitor.deleteMany({ schoolId });
});

import { eventBus } from "../../../core/events";
import Hostel from "../models/Hostel";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Hostel.deleteMany({ schoolId });
});

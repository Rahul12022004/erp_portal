import { eventBus } from "../../../core/events";
import Announcement from "../models/Announcement";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Announcement.deleteMany({ schoolId });
});

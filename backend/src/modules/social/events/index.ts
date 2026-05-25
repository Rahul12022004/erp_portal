import { eventBus } from "../../../core/events";
import SocialMedia from "../models/SocialMedia";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await SocialMedia.deleteMany({ schoolId });
});

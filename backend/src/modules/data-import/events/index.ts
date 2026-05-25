import { eventBus } from "../../../core/events";
import DataImportBatch from "../models/DataImportBatch";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await DataImportBatch.deleteMany({ school_id: schoolId });
});

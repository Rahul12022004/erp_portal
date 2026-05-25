import { eventBus } from "../../../core/events";
import LibraryAssignment from "../models/LibraryAssignment";
import LibraryBook from "../models/LibraryBook";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Promise.all([
    LibraryAssignment.deleteMany({ schoolId }),
    LibraryBook.deleteMany({ schoolId }),
  ]);
});

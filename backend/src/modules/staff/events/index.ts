import { eventBus } from "../../../core/events";
import LeaveApplication from "../models/LeaveApplication";
import Staff from "../models/Staff";
import TeacherRoleAssignment from "../models/TeacherRoleAssignment";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await Promise.all([
    LeaveApplication.deleteMany({ schoolId }),
    Staff.deleteMany({ schoolId }),
    TeacherRoleAssignment.deleteMany({ schoolId }),
  ]);
});

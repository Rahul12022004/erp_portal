import { eventBus } from "../../../core/events";
import InventoryItem from "../models/InventoryItem";

type SchoolDeletedPayload = {
  schoolId: string;
};

eventBus.subscribe<SchoolDeletedPayload>("school.deleted", async ({ schoolId }) => {
  await InventoryItem.deleteMany({ schoolId });
});

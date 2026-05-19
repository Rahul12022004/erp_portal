import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { FILTER_OPTIONS, type AnnouncementFilter } from "./types";

type AnnouncementFiltersProps = {
  searchQuery: string;
  activeFilter: AnnouncementFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: AnnouncementFilter) => void;
  totalCount: number;
  pinnedCount: number;
};

export default function AnnouncementFilters({
  searchQuery,
  activeFilter,
  onSearchChange,
  onFilterChange,
  totalCount,
  pinnedCount,
}: AnnouncementFiltersProps) {
  return (
    <div className="stat-card space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Search and filter</h3>
          <p className="text-xs text-slate-500">
            Narrow the communication feed for faster review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-slate-200 bg-slate-50 text-slate-700">
            {totalCount} total
          </Badge>
          <Badge className="border-blue-200 bg-blue-50 text-blue-700">
            {pinnedCount} pinned
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by title or message"
            className="pl-9"
          />
        </div>

        <Select value={activeFilter} onValueChange={(value) => onFilterChange(value as AnnouncementFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Filter announcements" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((filterOption) => (
              <SelectItem key={filterOption} value={filterOption}>
                {filterOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

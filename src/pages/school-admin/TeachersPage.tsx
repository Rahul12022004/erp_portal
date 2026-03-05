import { useState } from "react";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const modulePermissions = [
  { id: "attendance", label: "Attendance" },
  { id: "students", label: "Students" },
  { id: "assignments", label: "Assignments" },
  { id: "marks", label: "Marks" },
  { id: "exams", label: "Exams" },
  { id: "communication", label: "Communication" },
  { id: "digital-classroom", label: "Digital Classroom" },
  { id: "timetable", label: "Time Table" },
];

const teachers = [
  { id: 1, name: "Dr. Anita Desai", email: "anita@school.com", phone: "+91 99876 54321", subject: "Mathematics", class: "10-A, 9-B", status: "Active", modules: ["attendance", "students", "marks", "exams"] },
  { id: 2, name: "Mr. Ravi Kumar", email: "ravi@school.com", phone: "+91 99876 54322", subject: "Science", class: "8-A, 7-A", status: "Active", modules: ["attendance", "students", "assignments", "digital-classroom"] },
  { id: 3, name: "Ms. Fatima Khan", email: "fatima@school.com", phone: "+91 99876 54323", subject: "English", class: "6-A, 9-A", status: "Active", modules: ["attendance", "students", "assignments", "communication"] },
  { id: 4, name: "Mr. Suresh Nair", email: "suresh@school.com", phone: "+91 99876 54324", subject: "History", class: "11-A, 12-A", status: "Inactive", modules: ["attendance", "marks"] },
];

export default function TeachersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const filtered = teachers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-header text-xl">Teachers / Staff</h2>
          <p className="text-sm text-muted-foreground">Manage teachers and assign module permissions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Teacher</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Teacher</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Full Name</Label><Input placeholder="Teacher name" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" placeholder="Email" /></div>
                <div><Label>Phone</Label><Input placeholder="Phone" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Subject</Label><Input placeholder="Subject" /></div>
                <div>
                  <Label>Class Assigned</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {["6-A","7-A","8-A","9-A","9-B","10-A","11-A","12-A"].map(c=>(
                        <SelectItem key={c} value={c}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Password</Label><Input type="password" placeholder="Set password" /></div>

              {/* Module Permissions */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Module Permissions</Label>
                <p className="text-xs text-muted-foreground">Select which modules this teacher can access</p>
                <div className="grid grid-cols-2 gap-2">
                  {modulePermissions.map((mod) => (
                    <label
                      key={mod.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedModules.includes(mod.id)}
                        onCheckedChange={() => toggleModule(mod.id)}
                      />
                      <span className="text-sm">{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button onClick={() => setOpen(false)} className="w-full">Create Teacher</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search teachers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>{t.class}</TableCell>
                <TableCell>{t.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {t.modules.slice(0, 3).map((m) => (
                      <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                    ))}
                    {t.modules.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{t.modules.length - 3}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={t.status === "Active" ? "default" : "secondary"}>{t.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Eye className="w-4 h-4 mr-2" />View</DropdownMenuItem>
                      <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

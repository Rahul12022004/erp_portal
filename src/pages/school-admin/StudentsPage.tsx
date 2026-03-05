import { useState } from "react";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const students = [
  { id: 1, name: "Aisha Patel", class: "10-A", section: "Secondary", roll: "S1001", guardian: "Rajesh Patel", contact: "+91 98765 43210", email: "aisha@email.com", admission: "2023-04-15", status: "Active" },
  { id: 2, name: "Rahul Sharma", class: "9-B", section: "Secondary", roll: "S1002", guardian: "Vikram Sharma", contact: "+91 98765 43211", email: "rahul@email.com", admission: "2023-04-16", status: "Active" },
  { id: 3, name: "Priya Singh", class: "8-A", section: "Middle", roll: "S1003", guardian: "Amit Singh", contact: "+91 98765 43212", email: "priya@email.com", admission: "2022-04-10", status: "Active" },
  { id: 4, name: "Mohammed Ali", class: "7-A", section: "Middle", roll: "S1004", guardian: "Hassan Ali", contact: "+91 98765 43213", email: "ali@email.com", admission: "2022-04-12", status: "Inactive" },
  { id: 5, name: "Sneha Gupta", class: "6-A", section: "Middle", roll: "S1005", guardian: "Ravi Gupta", contact: "+91 98765 43214", email: "sneha@email.com", admission: "2023-04-18", status: "Active" },
  { id: 6, name: "Arjun Reddy", class: "12-A", section: "Senior", roll: "S1006", guardian: "Krishna Reddy", contact: "+91 98765 43215", email: "arjun@email.com", admission: "2021-04-10", status: "Active" },
];

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.class.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-header text-xl">Students</h2>
          <p className="text-sm text-muted-foreground">Manage student records</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Student</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Student Name</Label><Input placeholder="Full name" /></div>
                <div><Label>Roll Number</Label><Input placeholder="Roll #" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Class</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {["6-A","7-A","8-A","9-A","9-B","10-A","11-A","12-A"].map(c=>(
                        <SelectItem key={c} value={c}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent>
                      {["Primary","Middle","Secondary","Senior"].map(s=>(
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Guardian Name</Label><Input placeholder="Guardian name" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contact</Label><Input placeholder="Phone number" /></div>
                <div><Label>Email</Label><Input type="email" placeholder="Email" /></div>
              </div>
              <div><Label>Address</Label><Input placeholder="Full address" /></div>
              <div><Label>Admission Date</Label><Input type="date" /></div>
              <Button onClick={() => setOpen(false)} className="w-full">Add Student</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Roll #</TableHead>
              <TableHead>Guardian</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.class}</TableCell>
                <TableCell>{s.roll}</TableCell>
                <TableCell>{s.guardian}</TableCell>
                <TableCell>{s.contact}</TableCell>
                <TableCell>
                  <Badge variant={s.status === "Active" ? "default" : "secondary"}>{s.status}</Badge>
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

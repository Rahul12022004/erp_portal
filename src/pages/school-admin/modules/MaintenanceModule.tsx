import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MaintenanceModule() {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Maintenance</CardTitle>
      </CardHeader>

      <CardContent className="space-y-8">

        {/* FILTER SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="plumbing">Plumbing</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tech1">Technician 1</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Block" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="block1">Block 1</SelectItem>
            </SelectContent>
          </Select>

          <Button>Search</Button>
        </div>

        {/* TICKETS TABLE */}
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Ref</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Assign Supervisor</th>
                <th className="p-3 text-left">Assign Technician</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3">1001</td>
                <td className="p-3">Electrical</td>
                <td className="p-3">Admin</td>

                <td className="p-3">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sup1">Supervisor 1</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                <td className="p-3">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech1">Technician 1</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                <td className="p-3">Pending</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ADD SUPERVISOR */}
        <div className="border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold">Add Supervisor</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input placeholder="Supervisor Name" />
            <Input placeholder="Mobile Number" />
            <Input placeholder="Password" type="password" />
          </div>
          <Button>Add Supervisor</Button>
        </div>

        {/* ADD TECHNICIAN */}
        <div className="border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold">Add Technician</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input placeholder="Technician Name" />
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electrical">Electrical</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Mobile Number" />
          </div>
          <Button>Add Technician</Button>
        </div>

      </CardContent>
    </Card>
  );
}
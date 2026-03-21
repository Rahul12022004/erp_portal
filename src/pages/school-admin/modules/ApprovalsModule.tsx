import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function ApprovalsModule() {
  const [requests, setRequests] = useState([]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Approvals</h1>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {["Total", "Pending", "Approved", "Rejected", "Cancel"].map((item) => (
            <div key={item} className="p-4 bg-muted rounded-xl text-center">
              <p className="text-sm text-muted-foreground">{item}</p>
              <p className="text-xl font-bold">0</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create Request */}
      <Card>
        <CardHeader>
          <CardTitle>Create Request</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-4">
          <Select>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Stationary</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger><SelectValue placeholder="Requester" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Input placeholder="Amount" />
          <Input placeholder="Description" />

          <Button
            onClick={() => setRequests([...requests, { id: Date.now() }])}
          >
            Submit
          </Button>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r, i) => (
                <div key={r.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <span>Request #{i + 1}</span>
                  <span className="text-sm text-yellow-500">Pending</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
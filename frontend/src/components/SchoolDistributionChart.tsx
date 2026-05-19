import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { month: "Jan", public: 4, private: 6 },
  { month: "Feb", public: 3, private: 8 },
  { month: "Mar", public: 5, private: 4 },
  { month: "Apr", public: 7, private: 5 },
  { month: "May", public: 6, private: 9 },
  { month: "Jun", public: 8, private: 7 },
];

export function SchoolDistributionChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
        <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 46%)" />
        <Tooltip
          contentStyle={{
            background: "hsl(0 0% 100%)",
            border: "1px solid hsl(220 13% 91%)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="public" fill="hsl(168 80% 36%)" radius={[4, 4, 0, 0]} name="Public" />
        <Bar dataKey="private" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} name="Private" />
      </BarChart>
    </ResponsiveContainer>
  );
}

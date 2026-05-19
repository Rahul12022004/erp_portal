import * as React from "react";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { PieChart, pieArcLabelClasses } from "@mui/x-charts/PieChart";
import { useDrawingArea } from "@mui/x-charts/hooks";
import { styled } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

type ViewType = "components" | "collection";

type ChartDatum = {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
};

type FeeStructureDistributionChartProps = {
  componentTotals: {
    academic: number;
    transport: number;
    other: number;
  };
  collectionTotals: {
    collected: number;
    pending: number;
  };
  statusBreakdown: {
    paid: number;
    partial: number;
    overdue: number;
    unpaid: number;
  };
};

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const StyledText = styled("text")(({ theme }: { theme: Theme }) => ({
  fill: theme.palette.text.primary,
  textAnchor: "middle",
  dominantBaseline: "central",
  fontSize: 18,
  fontWeight: 700,
}));

function PieCenterLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  const { width, height, left, top } = useDrawingArea();
  return <StyledText x={left + width / 2} y={top + height / 2}>{children}</StyledText>;
}

const componentColors = {
  academic: "#fa938e",
  transport: "#98bf45",
  other: "#51cbcf",
} as const;

const collectionColors = {
  collected: "#51cbcf",
  pending: "#fa938e",
} as const;

const statusOpacity = {
  paid: 0.95,
  partial: 0.75,
  overdue: 0.55,
  unpaid: 0.35,
} as const;

export default function FeeStructureDistributionChart({
  componentTotals,
  collectionTotals,
  statusBreakdown,
}: FeeStructureDistributionChartProps): React.ReactElement {
  const [view, setView] = React.useState<ViewType>("components");

  const totalAssigned =
    componentTotals.academic + componentTotals.transport + componentTotals.other ||
    collectionTotals.collected + collectionTotals.pending ||
    1;

  const componentData: ChartDatum[] = [
    {
      id: "academic",
      label: "Academic",
      value: componentTotals.academic,
      percentage: (componentTotals.academic / totalAssigned) * 100,
      color: componentColors.academic,
    },
    {
      id: "transport",
      label: "Transport",
      value: componentTotals.transport,
      percentage: (componentTotals.transport / totalAssigned) * 100,
      color: componentColors.transport,
    },
    {
      id: "other",
      label: "Other",
      value: componentTotals.other,
      percentage: (componentTotals.other / totalAssigned) * 100,
      color: componentColors.other,
    },
  ].filter((item) => item.value > 0);

  const componentCollectionData: ChartDatum[] = componentData.flatMap((item) => {
    const share = item.value / totalAssigned;
    const collectedValue = share * collectionTotals.collected;
    const pendingValue = share * collectionTotals.pending;

    return [
      {
        id: `${item.id}-collected`,
        label: `${item.label} collected`,
        value: collectedValue,
        percentage: item.value > 0 ? (collectedValue / item.value) * 100 : 0,
        color: item.color,
      },
      {
        id: `${item.id}-pending`,
        label: `${item.label} pending`,
        value: pendingValue,
        percentage: item.value > 0 ? (pendingValue / item.value) * 100 : 0,
        color: hexToRgba(item.color, 0.45),
      },
    ].filter((segment) => segment.value > 0);
  });

  const collectionData: ChartDatum[] = [
    {
      id: "collected",
      label: "Collected",
      value: collectionTotals.collected,
      percentage: (collectionTotals.collected / totalAssigned) * 100,
      color: collectionColors.collected,
    },
    {
      id: "pending",
      label: "Pending",
      value: collectionTotals.pending,
      percentage: (collectionTotals.pending / totalAssigned) * 100,
      color: collectionColors.pending,
    },
  ].filter((item) => item.value > 0);

  const statusTotal =
    statusBreakdown.paid +
    statusBreakdown.partial +
    statusBreakdown.overdue +
    statusBreakdown.unpaid || 1;

  const statusData: ChartDatum[] = [
    {
      id: "paid",
      label: "Paid students",
      value: statusBreakdown.paid,
      percentage: (statusBreakdown.paid / statusTotal) * 100,
      color: hexToRgba(collectionColors.collected, statusOpacity.paid),
    },
    {
      id: "partial",
      label: "Partial students",
      value: statusBreakdown.partial,
      percentage: (statusBreakdown.partial / statusTotal) * 100,
      color: hexToRgba(collectionColors.collected, statusOpacity.partial),
    },
    {
      id: "overdue",
      label: "Overdue students",
      value: statusBreakdown.overdue,
      percentage: (statusBreakdown.overdue / statusTotal) * 100,
      color: hexToRgba(collectionColors.pending, statusOpacity.overdue),
    },
    {
      id: "unpaid",
      label: "Unpaid students",
      value: statusBreakdown.unpaid,
      percentage: (statusBreakdown.unpaid / statusTotal) * 100,
      color: hexToRgba(collectionColors.pending, statusOpacity.unpaid),
    },
  ].filter((item) => item.value > 0);

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextView: ViewType | null,
  ) => {
    if (nextView) {
      setView(nextView);
    }
  };

  const innerRadius = 56;
  const middleRadius = 120;

  return (
    <Box sx={{ width: "100%", textAlign: "center" }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: "#0f172a" }}>
        Class finance distribution
      </Typography>
      <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
        Switch between fee structure mix and collection status for the active class.
      </Typography>
      <ToggleButtonGroup
        color="primary"
        size="small"
        value={view}
        exclusive
        onChange={handleViewChange}
        sx={{ mb: 2, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 999 }}
      >
        <ToggleButton value="components">Fee Mix</ToggleButton>
        <ToggleButton value="collection">Collection</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ display: "flex", justifyContent: "center", height: 380 }}>
        {view === "components" ? (
          <PieChart
            series={[
              {
                innerRadius,
                outerRadius: middleRadius,
                data: componentData,
                arcLabel: (item) => `${item.label} (${(item as ChartDatum).percentage.toFixed(0)}%)`,
                valueFormatter: ({ value }) => `${value.toLocaleString()} assigned`,
                highlightScope: { fade: "global", highlight: "item" },
                highlighted: { additionalRadius: 3 },
                cornerRadius: 4,
              },
              {
                innerRadius: middleRadius,
                outerRadius: middleRadius + 26,
                data: componentCollectionData,
                arcLabel: (item) => `${item.label} (${(item as ChartDatum).percentage.toFixed(0)}%)`,
                valueFormatter: ({ value }) => `${value.toLocaleString()} of assigned value`,
                arcLabelRadius: 156,
                highlightScope: { fade: "global", highlight: "item" },
                highlighted: { additionalRadius: 3 },
                cornerRadius: 4,
              },
            ]}
            sx={{
              [`& .${pieArcLabelClasses.root}`]: {
                fontSize: "11px",
                fill: "#334155",
              },
            }}
            hideLegend
          >
            <PieCenterLabel>Fee Mix</PieCenterLabel>
          </PieChart>
        ) : (
          <PieChart
            series={[
              {
                innerRadius,
                outerRadius: middleRadius,
                data: collectionData,
                arcLabel: (item) => `${item.label} (${(item as ChartDatum).percentage.toFixed(0)}%)`,
                valueFormatter: ({ value }) => `${value.toLocaleString()} amount`,
                highlightScope: { fade: "global", highlight: "item" },
                highlighted: { additionalRadius: 3 },
                cornerRadius: 4,
              },
              {
                innerRadius: middleRadius,
                outerRadius: middleRadius + 26,
                data: statusData,
                arcLabel: (item) => `${item.label} (${(item as ChartDatum).percentage.toFixed(0)}%)`,
                arcLabelRadius: 156,
                valueFormatter: ({ value }) => `${value} students`,
                highlightScope: { fade: "global", highlight: "item" },
                highlighted: { additionalRadius: 3 },
                cornerRadius: 4,
              },
            ]}
            sx={{
              [`& .${pieArcLabelClasses.root}`]: {
                fontSize: "11px",
                fill: "#334155",
              },
            }}
            hideLegend
          >
            <PieCenterLabel>Collection</PieCenterLabel>
          </PieChart>
        )}
      </Box>
    </Box>
  );
}
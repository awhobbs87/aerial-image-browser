import { Card, CardContent, CardActions, Box, Skeleton, Stack } from "@mui/material";
import { borderRadius } from "../theme/tokens";

export default function PhotoCardSkeleton() {
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: `${borderRadius.lg}px`,
        overflow: "hidden",
      }}
    >
      {/* Thumbnail skeleton with shimmer */}
      <Skeleton
        variant="rectangular"
        height={150}
        animation="wave"
        sx={{
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)",
        }}
      />

      <CardContent sx={{ flexGrow: 1, py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={0.75}>
          {/* Chips skeleton */}
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <Skeleton variant="rounded" width={60} height={24} animation="wave" />
            <Skeleton variant="rounded" width={70} height={24} animation="wave" />
          </Box>

          {/* Title skeleton */}
          <Skeleton variant="text" width="85%" height={20} animation="wave" />

          {/* Metadata skeletons */}
          <Skeleton variant="text" width="60%" height={16} animation="wave" />
          <Skeleton variant="text" width="50%" height={16} animation="wave" />
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 1.5, pt: 0 }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Skeleton variant="circular" width={32} height={32} animation="wave" />
          <Skeleton variant="circular" width={32} height={32} animation="wave" />
          <Skeleton variant="circular" width={32} height={32} animation="wave" />
        </Box>
        <Skeleton variant="circular" width={32} height={32} animation="wave" />
      </CardActions>
    </Card>
  );
}

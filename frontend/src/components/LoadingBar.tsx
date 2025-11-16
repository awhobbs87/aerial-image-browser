import { LinearProgress, Box } from '@mui/material';

interface LoadingBarProps {
  loading: boolean;
}

export default function LoadingBar({ loading }: LoadingBarProps) {
  if (!loading) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      <LinearProgress
        sx={{
          height: 3,
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s linear',
          },
        }}
      />
    </Box>
  );
}

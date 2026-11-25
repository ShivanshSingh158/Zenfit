import React, { memo, useEffect, useState } from 'react';
import { TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { NumericText } from '../ui/NumericText';

const WorkoutTimer = memo(function WorkoutTimer({
  startTime,
  style,
}: {
  startTime: number;
  style?: StyleProp<TextStyle>;
}) {
  const { tokens } = useTheme();
  const [elapsed, setElapsed] = useState(
    Math.max(0, Math.floor((Date.now() - startTime) / 1000))
  );

  useEffect(() => {
    setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    const iv = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000))),
      1000
    );
    return () => clearInterval(iv);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const label =
    h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;

  return (
    <NumericText
      style={[
        {
          fontSize: 13,
          color: tokens.accent.primary,
        },
        style,
      ]}
    >
      {label}
    </NumericText>
  );
});

export default WorkoutTimer;

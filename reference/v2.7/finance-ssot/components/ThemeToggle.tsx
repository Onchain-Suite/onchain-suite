'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const t = mounted ? (theme ?? 'light') : 'light';
  return (
    <ToggleGroup multiple={false} value={[t]} onValueChange={(v) => { if (v[0]) setTheme(v[0]); }} variant="outline" size="sm" aria-label="Theme">
      <ToggleGroupItem value="light" aria-label="Light theme"><SunIcon /></ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark theme"><MoonIcon /></ToggleGroupItem>
    </ToggleGroup>
  );
}

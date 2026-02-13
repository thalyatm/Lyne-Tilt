import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to work even in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlOrCmd ? ctrlOrCmd : !ctrlOrCmd;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Common shortcuts for modals
export function useModalShortcuts(onClose: () => void, onSave?: () => void) {
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'Escape',
      action: onClose,
      description: 'Close modal',
    },
  ];

  if (onSave) {
    shortcuts.push({
      key: 's',
      ctrlOrCmd: true,
      action: onSave,
      description: 'Save',
    });
  }

  useKeyboardShortcuts(shortcuts);
}

// Format shortcut for display
export function formatShortcut(config: Omit<ShortcutConfig, 'action'>): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (config.ctrlOrCmd) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (config.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (config.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Capitalize single letter keys
  const key = config.key.length === 1 ? config.key.toUpperCase() : config.key;
  parts.push(key);

  return parts.join(isMac ? '' : '+');
}

import { Modal, Table, Text, Group, Kbd } from '@mantine/core';
import { IconKeyboard } from '@tabler/icons-react';

interface KeyboardShortcutsHelpProps {
  opened: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['/', 'Ctrl', 'K'], description: 'Focus search' },
  { keys: ['Escape'], description: 'Close panel / blur search' },
  { keys: ['G'], description: 'Toggle grid view' },
  { keys: ['T'], description: 'Toggle timeline view' },
  { keys: ['F'], description: 'Toggle filter panel' },
  { keys: ['M'], description: 'Toggle map expanded' },
  { keys: ['1'], description: 'Comparison: slider mode' },
  { keys: ['2'], description: 'Comparison: side-by-side mode' },
  { keys: ['3'], description: 'Comparison: then vs now mode' },
  { keys: ['?'], description: 'Show this help' },
];

export function KeyboardShortcutsHelp({ opened, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconKeyboard size={20} />
          <Text fw={600}>Keyboard Shortcuts</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Shortcut</Table.Th>
            <Table.Th>Action</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {SHORTCUTS.map((shortcut) => (
            <Table.Tr key={shortcut.description}>
              <Table.Td>
                <Group gap={4}>
                  {shortcut.keys.map((key, i) => (
                    <span key={i}>
                      {i > 0 && (
                        <Text span size="xs" c="dimmed" mx={2}>
                          +
                        </Text>
                      )}
                      <Kbd size="sm">{key}</Kbd>
                    </span>
                  ))}
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{shortcut.description}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Modal>
  );
}

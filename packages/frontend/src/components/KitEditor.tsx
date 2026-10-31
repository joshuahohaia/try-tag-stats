import { useState } from 'react';
import { Alert, Button, Collapse, ColorInput, Group, Stack, Text } from '@mantine/core';
import { TeamJersey } from './TeamJersey';
import { jerseyStyle } from '../utils/jersey';
import { kitErrorMessage, useSaveKit, useTeamKit } from '../hooks/useKits';

const SWATCHES = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#16a085', '#2980b9', '#8e44ad', '#2c3e50', '#ffffff', '#111111'];

function lastChanged(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Shared kit editor. There are no logins: anyone can change any team's kit, so it shows when it last changed. */
export function KitEditor({ teamId, name }: { teamId: number; name: string }) {
  const kit = useTeamKit(teamId);
  const generated = jerseyStyle(name);
  const [draft, setDraft] = useState<{ primary: string; secondary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { save, reset } = useSaveKit(teamId);

  const current = {
    primary: draft?.primary ?? kit?.primary ?? generated.primary,
    secondary: draft?.secondary ?? kit?.secondary ?? generated.secondary,
  };
  const busy = save.isPending || reset.isPending;
  const valid = /^#[0-9a-f]{6}$/i.test(current.primary) && /^#[0-9a-f]{6}$/i.test(current.secondary);

  return (
    <Stack gap="sm" role="group" aria-label={`Edit ${name} kit`}>
      <Text size="sm" c="dimmed">
        Kit colours are shared: everyone sees the change, and anyone can change them.
        {kit ? ` Last changed ${lastChanged(kit.updatedAt)}.` : ' Currently using the generated colours.'}
      </Text>
      <Group align="flex-end" wrap="wrap">
        <TeamJersey name={name} colours={current} size={64} />
        <ColorInput
          label="Shirt colour"
          format="hex"
          swatches={SWATCHES}
          value={current.primary}
          onChange={(v) => setDraft({ ...current, primary: v })}
          style={{ flex: '1 1 140px' }}
        />
        <ColorInput
          label="Trim colour"
          format="hex"
          swatches={SWATCHES}
          value={current.secondary}
          onChange={(v) => setDraft({ ...current, secondary: v })}
          style={{ flex: '1 1 140px' }}
        />
      </Group>
      {error && (
        <Alert color="red" role="alert" variant="light">
          {error}
        </Alert>
      )}
      <Group>
        <Button
          loading={save.isPending}
          disabled={busy || !valid || !draft}
          onClick={() => {
            setError(null);
            save.mutate(
              { ...current, expectedVersion: kit?.version ?? null },
              { onSuccess: () => setDraft(null), onError: (e) => { setError(kitErrorMessage(e)); setDraft(null); } }
            );
          }}
        >
          Save kit
        </Button>
        <Button
          variant="default"
          loading={reset.isPending}
          disabled={busy || !kit}
          onClick={() => {
            if (!kit) return;
            setError(null);
            reset.mutate(kit.version, {
              onSuccess: () => setDraft(null),
              onError: (e) => { setError(kitErrorMessage(e)); setDraft(null); },
            });
          }}
        >
          Reset to generated colours
        </Button>
      </Group>
    </Stack>
  );
}

/** A toggle that reveals the editor, so the page stays quiet until someone wants to change the kit. */
export function KitSection({ teamId, name }: { teamId: number; name: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `kit-panel-${teamId}`;
  return (
    <div>
      <Button
        variant="subtle"
        size="compact-sm"
        style={{ marginLeft: -8 }}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Close kit editor' : 'Edit kit'}
      </Button>
      <Collapse in={open} id={panelId}>
        <div style={{ paddingTop: 8 }}>
          <KitEditor teamId={teamId} name={name} />
        </div>
      </Collapse>
    </div>
  );
}

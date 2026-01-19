import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Stack,
  Group,
  Button,
  Divider,
  Container,
  Badge,
  Alert,
  Anchor,
  ScrollArea,
  ActionIcon,
} from '@mantine/core';
import {
  IconBrandGithub,
  IconBug,
  IconTrash,
  IconHeart,
  IconExternalLink,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useFavoriteTeams } from '../hooks/useFavorites';

const GITHUB_REPO = 'https://github.com/joshuahohaia/try-tag-stats';
const NEW_ISSUE_URL = `${GITHUB_REPO}/issues/new`;
const ISSUES_URL = `${GITHUB_REPO}/issues`;

function SettingsPage() {
  const { favorites, removeTeam, cleanupFavorites } = useFavoriteTeams();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearFavorites = () => {
    cleanupFavorites([]);
    setShowClearConfirm(false);
  };

  return (
    <ScrollArea h="100%" type="auto">
      <Container size="sm" py="xl">
        <Stack gap="lg">
          <Title order={1}>Settings</Title>

        {/* Feedback & Support */}
        <Card withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconBug size={20} />
              <Title order={3}>Feedback & Support</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Found a bug or have a feature request? Let us know on GitHub!
            </Text>
            <Group>
              <Button
                component="a"
                href={NEW_ISSUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconBrandGithub size={18} />}
                rightSection={<IconExternalLink size={14} />}
                variant="filled"
              >
                Report Issue / Request Feature
              </Button>
              <Button
                component="a"
                href={ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconBrandGithub size={18} />}
                rightSection={<IconExternalLink size={14} />}
                variant="light"
              >
                View Open Issues
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Favorite Teams */}
        <Card withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconHeart size={20} />
              <Title order={3}>Favorite Teams</Title>
              <Badge variant="light">{favorites.length} teams</Badge>
            </Group>
            <Text size="sm" c="dimmed">
              Manage your favorite teams. Favorites are stored locally in your browser.
            </Text>

            {favorites.length > 0 ? (
              <>
                <Stack gap="xs">
                  {favorites.map((team) => (
                    <Group key={team.id} justify="space-between" wrap="nowrap">
                      <Text size="sm" lineClamp={1}>{team.name}</Text>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => removeTeam(team.id)}
                        title="Remove from favorites"
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>

                <Divider />

                {showClearConfirm ? (
                  <Alert color="red" title="Clear all favorites?">
                    <Stack gap="sm">
                      <Text size="sm">This action cannot be undone.</Text>
                      <Group>
                        <Button
                          color="red"
                          size="xs"
                          onClick={handleClearFavorites}
                        >
                          Yes, clear all
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setShowClearConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </Group>
                    </Stack>
                  </Alert>
                ) : (
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={() => setShowClearConfirm(true)}
                  >
                    Clear All Favorites
                  </Button>
                )}
              </>
            ) : (
              <Text size="sm" c="dimmed" fs="italic">
                No favorite teams yet. Star teams from league standings to add them here.
              </Text>
            )}
          </Stack>
        </Card>

        {/* About */}
        <Card withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconInfoCircle size={20} />
              <Title order={3}>About</Title>
            </Group>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Version</Text>
                <Text size="sm">1.0.0</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Source Code</Text>
                <Anchor
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                >
                  <Group gap={4}>
                    <IconBrandGithub size={14} />
                    GitHub
                  </Group>
                </Anchor>
              </Group>
            </Stack>
            <Divider />
            <Text size="xs" c="dimmed">
              Try Tag Stats is an unofficial app for viewing Try Tag Rugby league data.
              Not affiliated with Try Tag Rugby.
            </Text>
          </Stack>
        </Card>
        </Stack>
      </Container>
    </ScrollArea>
  );
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

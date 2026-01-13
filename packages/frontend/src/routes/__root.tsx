import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AppShell, Burger, Group, Title, NavLink, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconHome,
  IconTrophy,
  IconUsers,
  IconCalendar,
  IconChartBar,
  IconStar,
} from '@tabler/icons-react';
import { Link, useRouterState } from '@tanstack/react-router';

function RootLayout() {
  const [opened, { toggle }] = useDisclosure();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const navItems = [
    { to: '/', label: 'Home', icon: IconHome },
    { to: '/leagues', label: 'Leagues', icon: IconTrophy },
    { to: '/teams', label: 'Teams', icon: IconUsers },
    { to: '/fixtures', label: 'Fixtures', icon: IconCalendar },
    { to: '/statistics', label: 'Statistics', icon: IconChartBar },
    { to: '/favorites', label: 'Favorites', icon: IconStar },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3} c="green">Try Tag Stats</Title>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              component={Link}
              to={item.to}
              label={item.label}
              leftSection={<item.icon size={20} />}
              active={currentPath === item.to}
              onClick={() => opened && toggle()}
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});

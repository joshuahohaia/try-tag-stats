import { createRootRoute, Outlet } from '@tanstack/react-router';
import {
  AppShell,
  Image,
  Group,
  Stack,
  Tooltip,
  UnstyledButton,
  rem,
  Center,
  Box,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconHome,
  IconTrophy,
  IconUsers,
  IconCalendar,
  IconSettings,
} from '@tabler/icons-react';
import { Link, useRouterState } from '@tanstack/react-router';

interface NavbarLinkProps {
  icon: typeof IconHome;
  label: string;
  active?: boolean;
  to: string;
}

function NavbarLink({ icon: Icon, label, active, to }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton
        component={Link}
        to={to}
        style={(theme) => ({
          width: rem(50),
          height: rem(50),
          borderRadius: theme.radius.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: active ? 'var(--mantine-color-brand-6)' : 'var(--mantine-color-dimmed)',
          backgroundColor: active ? 'var(--mantine-color-brand-0)' : 'transparent',
          '&:hover': {
            backgroundColor: active ? 'var(--mantine-color-brand-0)' : 'var(--mantine-color-gray-0)',
            color: active ? 'var(--mantine-color-brand-6)' : 'var(--mantine-color-black)',
          },
        })}
      >
        <Icon style={{ width: rem(22), height: rem(22) }} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

function RootLayout() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const isMobile = useMediaQuery('(max-width: 48em)');

  const navItems = [
    { to: '/', label: 'Home', icon: IconHome },
    { to: '/leagues', label: 'Leagues', icon: IconTrophy },
    { to: '/fixtures', label: 'Fixtures', icon: IconCalendar },
    { to: '/teams', label: 'Teams', icon: IconUsers },
    { to: '/settings', label: 'Settings', icon: IconSettings },
  ];

  return (
    <AppShell
      navbar={{
        width: 80,
        breakpoint: 'sm',
        collapsed: { mobile: true },
      }}
      footer={{
        height: 65,
        collapsed: !isMobile,
      }}
      padding="0"
    >
      <AppShell.Navbar p="md">
        <Center>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Image
              src="/logo.png"
              alt="Try Tag Stats"
              w={40}
              radius="md"
              mb="xl"
            />
          </Link>
        </Center>
        <Stack justify="center" gap={5}>
          {navItems.map((item) => (
            <NavbarLink
              key={item.to}
              {...item}
              active={currentPath === item.to}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main h="100vh" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box
          flex={1}
          h="100%"
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <Outlet />
        </Box>
      </AppShell.Main>

      {/* Mobile Bottom Navigation */}
      <AppShell.Footer p={0} hiddenFrom="sm" style={{ display: 'flex', alignItems: 'center' }}>
        <Group justify="space-around" w="100%" px="xs" gap={0}>
          {navItems.map((item) => (
            <UnstyledButton
              key={item.to}
              component={Link}
              to={item.to}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 0',
                color: currentPath === item.to ? 'var(--mantine-color-brand-6)' : 'var(--mantine-color-dimmed)',
              }}
            >
              <item.icon size={24} stroke={1.5} />
            </UnstyledButton>
          ))}
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
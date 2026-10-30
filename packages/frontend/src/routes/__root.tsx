import { createRootRoute, Outlet } from '@tanstack/react-router';
import {
  AppShell,
  Image,
  Group,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
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
        className={`nav-link${active ? ' nav-link--active' : ''}`}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={22} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

/**
 * A nav item stays highlighted for its nested routes too
 * (e.g. Teams on /teams/123). Home only matches exactly.
 */
function isNavActive(itemTo: string, currentPath: string): boolean {
  if (itemTo === '/') return currentPath === '/';
  return currentPath === itemTo || currentPath.startsWith(`${itemTo}/`);
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
              active={isNavActive(item.to, currentPath)}
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
          {navItems.map((item) => {
            const active = isNavActive(item.to, currentPath);
            return (
              <UnstyledButton
                key={item.to}
                component={Link}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '6px 0',
                  color: active ? 'var(--mantine-color-brand-6)' : 'var(--mantine-color-dimmed)',
                }}
              >
                <item.icon size={22} stroke={1.5} />
                <Text fz={10} lh={1.2} fw={active ? 600 : 400} c="inherit">
                  {item.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});

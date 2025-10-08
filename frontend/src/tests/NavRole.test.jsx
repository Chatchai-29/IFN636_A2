import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Nav from '../components/Nav';

test('Owner nav is themed and links to Owner Dashboard', () => {
  render(
    <MemoryRouter>
      <Nav user={{ role: 'owner' }} />
    </MemoryRouter>
  );
  const nav = screen.getByRole('navigation');
  expect(nav.className).toMatch(/owner-theme|bg-owner|owner-nav/i);
  const ownerLink = screen.getByRole('link', { name: /dashboard/i });
  expect(ownerLink.getAttribute('href')).toMatch(/owner\/dashboard/i);
});

test('Admin nav themed differently', () => {
  render(
    <MemoryRouter>
      <Nav user={{ role: 'admin' }} />
    </MemoryRouter>
  );
  const nav = screen.getByRole('navigation');
  expect(nav.className).toMatch(/admin-theme|bg-admin/i);
});

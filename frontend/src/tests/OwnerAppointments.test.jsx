import { render, screen } from '@testing-library/react';
import OwnerAppointments from '../pages/OwnerAppointments';

test('OwnerAppointments hides admin-only controls', () => {
  render(<OwnerAppointments />);
  expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
  expect(screen.queryByText(/all owners/i)).toBeNull();
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/ToastProvider';
import { api } from '../../service';
import DeliveryMetricSettings from '../DeliveryMetricSettings';

vi.mock('../../service', () => ({ api: { deliverySettings: { get: vi.fn(), save: vi.fn() } } }));

function renderSettings() {
  render(<MemoryRouter><ToastProvider><DeliveryMetricSettings /></ToastProvider></MemoryRouter>);
}

describe('Delivery metrics settings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.deliverySettings.get).mockResolvedValue({ filters: [{ clickUrlId: 1, showBid: false, name: 'Existing' }] });
  });

  it('loads saved JSON and saves edited filters', async () => {
    renderSettings();
    const input = await screen.findByLabelText('Filters JSON');
    await waitFor(() => expect(input).toHaveValue(JSON.stringify([{ clickUrlId: 1, showBid: false, name: 'Existing' }], null, 2)));
    const filters = [{ clickUrlId: 2, showBid: true, name: 'Updated' }];
    vi.mocked(api.deliverySettings.save).mockResolvedValue({ filters });
    fireEvent.change(input, { target: { value: JSON.stringify(filters) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(api.deliverySettings.save).toHaveBeenCalledWith(filters));
    expect(await screen.findByText('Delivery metrics settings saved')).toBeInTheDocument();
  });

  it('prevents invalid JSON from being sent and displays server validation errors', async () => {
    renderSettings();
    const input = screen.getByLabelText('Filters JSON');
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('must be an array');
    expect(api.deliverySettings.save).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '[{"clickUrlId":2}]' } });
    vi.mocked(api.deliverySettings.save).mockRejectedValue(new Error('showBid for 2 must be true or false'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('showBid'));
  });

  it('keeps saving disabled when loading fails', async () => {
    vi.mocked(api.deliverySettings.get).mockRejectedValue(new Error('Database unavailable'));
    renderSettings();
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    expect(screen.getByRole('button', { name: 'Save Settings' })).toBeDisabled();
  });
});

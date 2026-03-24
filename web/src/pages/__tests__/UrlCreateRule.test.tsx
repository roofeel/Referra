import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import UrlCreateRule from '../UrlCreateRule';

describe('UrlCreateRule', () => {
  it('renders create rule workspace with identity form and logic editor', () => {
    render(
      <MemoryRouter>
        <UrlCreateRule />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation', { name: 'URL Rules Navigation' });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(within(nav).getByRole('link', { name: /Url Rules/i })).toHaveAttribute('href', '/url-rules');

    expect(screen.getByText('Edit URL Rule')).toBeInTheDocument();
    expect(screen.getByText('Rule Identity')).toBeInTheDocument();
    expect(screen.getByLabelText('Client Select')).toBeInTheDocument();
    expect(screen.getByLabelText('Rule Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Rule Logic Code')).toBeInTheDocument();
    expect(screen.getByText('categorizeFunnel.js')).toBeInTheDocument();
    expect(screen.getByText('Format Code')).toBeInTheDocument();

    const cancelLink = screen.getByRole('link', { name: 'Cancel' });
    expect(cancelLink).toHaveAttribute('href', '/url-rules');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('allows adding a new client and selects it', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('Tesla');

    render(
      <MemoryRouter>
        <UrlCreateRule />
      </MemoryRouter>,
    );

    const select = screen.getByLabelText('Client Select');
    expect(select).toHaveValue('Chime');

    await user.selectOptions(select, '__add_client__');

    expect(promptSpy).toHaveBeenCalledWith('请输入新的 Client 名称');
    expect(screen.getByRole('option', { name: 'Tesla' })).toBeInTheDocument();
    expect(select).toHaveValue('Tesla');
    promptSpy.mockRestore();
  });

  it('allows editing rule logic code', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <UrlCreateRule />
      </MemoryRouter>,
    );

    const editor = screen.getByLabelText('Rule Logic Code') as HTMLTextAreaElement;
    expect(editor.value).toContain('async function categorizeFunnel');

    await user.clear(editor);
    await user.click(editor);
    await user.paste('return { segment: "custom" };');

    expect(editor).toHaveValue('return { segment: "custom" };');
  });
});

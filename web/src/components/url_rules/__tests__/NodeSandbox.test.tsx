import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NodeSandbox } from '../NodeSandbox';

const LOGIC_SOURCE = 'async function categorizeFunnel(ourl, rl, dl) { return { ourl, rl, dl }; }';

describe('NodeSandbox', () => {
  it('auto extracts rl and dl from ourl changes with case-insensitive keys', () => {
    render(<NodeSandbox logicSource={LOGIC_SOURCE} />);

    const ourlInput = screen.getByLabelText('ourl');
    const rlInput = screen.getByLabelText('rl') as HTMLInputElement;
    const dlInput = screen.getByLabelText('dl') as HTMLInputElement;

    fireEvent.change(ourlInput, {
      target: {
        value: 'https://example.com/path?RL=UpperRl&Dl=upper_dl',
      },
    });

    expect(rlInput.value).toBe('UpperRl');
    expect(dlInput.value).toBe('upper_dl');
  });
});

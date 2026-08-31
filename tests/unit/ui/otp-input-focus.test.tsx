import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { OtpInput } from '@/ui-system/components/composed/OtpInput';

function ControllableOtp({
  clearOnClick,
}: {
  clearOnClick?: boolean;
}): React.ReactElement {
  const [value, setValue] = useState('123456');
  return (
    <div>
      <OtpInput length={6} value={value} onChange={setValue} autoFocus />
      {clearOnClick ? (
        <button type="button" onClick={() => setValue('')}>
          Clear
        </button>
      ) : null}
    </div>
  );
}

describe('OtpInput', () => {
  it('refocuses the first digit when value is cleared by the parent', async () => {
    render(<ControllableOtp clearOnClick />);

    const digitInputs = screen.getAllByLabelText(/Digit \d of 6/);
    digitInputs[2]!.focus();
    expect(digitInputs[2]).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(digitInputs[0]).toHaveFocus();
    });
    digitInputs.forEach((input) => {
      expect((input as HTMLInputElement).value).toBe('');
    });
  });
});

/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import {
  PopupRouter,
  useRouter,
  useNavigate,
  useParams,
  Route,
  Switch,
} from '@/ui-system/router/PopupRouter';

function RouterProbe() {
  const router = useRouter();
  const { navigate, goBack } = useNavigate();
  const params = useParams();
  return (
    <div>
      <span data-testid="route">{router.currentRoute}</span>
      <span data-testid="canGoBack">{String(router.canGoBack)}</span>
      <span data-testid="params">{JSON.stringify(params)}</span>
      <button
        data-testid="go-signin"
        onClick={() => navigate('sign-in', { domain: 'x.com' })}
      >
        signin
      </button>
      <button data-testid="go-collections" onClick={() => navigate('collections')}>
        collections
      </button>
      <button data-testid="back" onClick={goBack}>
        back
      </button>
    </div>
  );
}

describe('PopupRouter', () => {
  it('starts at the initial route with empty history (canGoBack=false)', () => {
    render(
      <PopupRouter initialRoute="welcome">
        <RouterProbe />
      </PopupRouter>
    );

    expect(screen.getByTestId('route').textContent).toBe('welcome');
    expect(screen.getByTestId('canGoBack').textContent).toBe('false');
  });

  it('navigates and exposes canGoBack=true once history grows', () => {
    render(
      <PopupRouter initialRoute="welcome">
        <RouterProbe />
      </PopupRouter>
    );

    act(() => {
      screen.getByTestId('go-signin').click();
    });

    expect(screen.getByTestId('route').textContent).toBe('sign-in');
    expect(screen.getByTestId('canGoBack').textContent).toBe('true');
    expect(screen.getByTestId('params').textContent).toBe('{"domain":"x.com"}');
  });

  it('goBack returns to the previous route', () => {
    render(
      <PopupRouter initialRoute="welcome">
        <RouterProbe />
      </PopupRouter>
    );

    act(() => {
      screen.getByTestId('go-signin').click();
    });
    expect(screen.getByTestId('route').textContent).toBe('sign-in');

    act(() => {
      screen.getByTestId('back').click();
    });
    expect(screen.getByTestId('route').textContent).toBe('welcome');
    expect(screen.getByTestId('canGoBack').textContent).toBe('false');
  });

  it('goBack at history length 1 is a no-op', () => {
    render(
      <PopupRouter initialRoute="welcome">
        <RouterProbe />
      </PopupRouter>
    );

    act(() => {
      screen.getByTestId('back').click();
    });
    expect(screen.getByTestId('route').textContent).toBe('welcome');
  });

  it('calls onRouteChange on every navigation', () => {
    const onRouteChange = vi.fn();
    render(
      <PopupRouter initialRoute="welcome" onRouteChange={onRouteChange}>
        <RouterProbe />
      </PopupRouter>
    );

    act(() => {
      screen.getByTestId('go-signin').click();
    });
    expect(onRouteChange).toHaveBeenCalledWith('sign-in', { domain: 'x.com' });

    act(() => {
      screen.getByTestId('back').click();
    });
    // Second call: back navigation to previous entry
    expect(onRouteChange).toHaveBeenCalledTimes(2);
  });

  it('Route renders children only when its path matches', () => {
    render(
      <PopupRouter initialRoute="welcome">
        <Route path="welcome">
          <span data-testid="welcome">welcome content</span>
        </Route>
        <Route path="sign-in">
          <span data-testid="signin">signin content</span>
        </Route>
      </PopupRouter>
    );

    expect(screen.queryByTestId('welcome')).toBeInTheDocument();
    expect(screen.queryByTestId('signin')).not.toBeInTheDocument();
  });

  it('Switch renders only the first matching child', () => {
    render(
      <PopupRouter initialRoute="welcome">
        <Switch>
          <Route path="welcome">
            <span data-testid="first">a</span>
          </Route>
          <Route path="welcome">
            <span data-testid="second">b</span>
          </Route>
        </Switch>
      </PopupRouter>
    );

    expect(screen.queryByTestId('first')).toBeInTheDocument();
    expect(screen.queryByTestId('second')).not.toBeInTheDocument();
  });
});

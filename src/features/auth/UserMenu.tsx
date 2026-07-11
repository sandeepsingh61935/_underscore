import { Settings, LogOut, ChevronDown } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { Text } from '../../ui-system/components/primitives/Text';

import type { User } from './hooks/useCurrentUser';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Open user menu for ${user.displayName}`}
        className="u-avatar-btn"
        style={{
          display: 'flex',
          minHeight: '44px',
          alignItems: 'center',
          gap: 8,
          borderRadius: 9999,
          padding: '6px 8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
      >
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 9999,
          background: 'var(--accent-tint-18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
        }}>
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.displayName}
              style={{ width: '100%', height: '100%', borderRadius: 9999 }}
            />
          ) : (
            <span className="u-sans" style={{ fontSize: 'var(--step-0)', fontWeight: 500 }}>
              {user.displayName?.[0] || 'U'}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--ink-3)',
            transition: 'transform 0.15s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: 8,
          width: 224,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--rule)',
          background: 'var(--paper)',
          boxShadow: '0 8px 24px var(--utility-overlay-08), 0 1px 0 var(--utility-overlay-06)',
          padding: 8,
          zIndex: 50,
        }}>
          <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--rule-soft)', marginBottom: 8 }}>
            <Text variant="small" style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName}
            </Text>
            <Text variant="tiny" muted style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </Text>
          </div>

          <button
            type="button"
            className="u-card-row"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: '100%',
              gap: 8,
              minHeight: '44px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius)',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <Settings size={16} />
            <span className="u-sans" style={{ fontSize: 'var(--step-0)' }}>Settings</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="u-card-row"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: '100%',
              gap: 8,
              minHeight: '44px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius)',
              color: 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
            <span className="u-sans" style={{ fontSize: 'var(--step-0)' }}>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

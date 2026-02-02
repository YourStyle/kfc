import React from 'react';
import { RocketIcon } from './Icons';

type NavItem = 'levels' | 'leaderboard' | 'profile' | 'rules';

interface BottomNavProps {
  active: NavItem | null;
  onNavigate: (item: NavItem) => void;
}

const navItems: { id: NavItem; label: string; hasIcon?: boolean }[] = [
  { id: 'levels', label: 'Играть', hasIcon: true },
  { id: 'leaderboard', label: 'Рейтинг' },
  { id: 'profile', label: 'Профиль' },
  { id: 'rules', label: 'Правила' },
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <div style={styles.container}>
      <div style={styles.pill}>
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
              onClick={() => onNavigate(item.id)}
            >
              {item.hasIcon && (
                <RocketIcon size={18} color={isActive ? '#fff' : 'rgba(255,255,255,0.5)'} />
              )}
              <span
                style={{
                  ...styles.label,
                  ...(isActive ? styles.labelActive : {}),
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    padding: '0 16px',
    width: '100%',
    maxWidth: 420,
    boxSizing: 'border-box',
  },
  pill: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(180deg, rgba(35, 45, 65, 0.95) 0%, rgba(25, 35, 55, 0.98) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 20,
    padding: '8px 12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: 14,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    gap: 6,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
  },
  labelActive: {
    color: '#fff',
  },
};

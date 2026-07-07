import * as React from 'react';

// Common CSS constants for premium feel (dark mode, glassmorphism)
const theme = {
  bgGlass: 'rgba(30, 41, 59, 0.7)',
  borderGlass: '1px solid rgba(255, 255, 255, 0.08)',
  shadowGlass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#38BDF8', // Stellar sky blue
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444'
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, style, ...props }) => {
  const getColors = () => {
    switch (variant) {
      case 'secondary':
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          color: theme.textPrimary,
          border: '1px solid rgba(255, 255, 255, 0.1)'
        };
      case 'danger':
        return {
          bg: theme.danger,
          color: '#FFFFFF',
          border: 'none'
        };
      case 'primary':
      default:
        return {
          bg: theme.primary,
          color: '#0F172A',
          border: 'none'
        };
    }
  };

  const colors = getColors();

  const buttonStyle: React.CSSProperties = {
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    backgroundColor: colors.bg,
    color: colors.color,
    border: colors.border,
    fontFamily: 'inherit',
    ...style
  };

  return (
    <button style={buttonStyle} {...props}>
      {children}
    </button>
  );
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
  const cardStyle: React.CSSProperties = {
    background: theme.bgGlass,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: theme.borderGlass,
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: theme.shadowGlass,
    color: theme.textPrimary,
    fontFamily: 'inherit',
    ...style
  };

  return (
    <div style={cardStyle} {...props}>
      {children}
    </div>
  );
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type?: 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ type = 'info', children, style, ...props }) => {
  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: theme.success };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: theme.warning };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: theme.danger };
      case 'info':
      default:
        return { bg: 'rgba(56, 189, 248, 0.15)', color: theme.primary };
    }
  };

  const colors = getColors();

  const badgeStyle: React.CSSProperties = {
    padding: '0.2rem 0.6rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: colors.bg,
    color: colors.color,
    display: 'inline-block',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    ...style
  };

  return (
    <span style={badgeStyle} {...props}>
      {children}
    </span>
  );
};

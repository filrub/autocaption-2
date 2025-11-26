import { createTheme } from '@mantine/core'

// Professional color palette for photo editing app
export const appTheme = createTheme({
  // Typography
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: 600,
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '1.2' },
      h2: { fontSize: '1.875rem', lineHeight: '1.3' },
      h3: { fontSize: '1.5rem', lineHeight: '1.4' },
      h4: { fontSize: '1.25rem', lineHeight: '1.5' },
    }
  },

  // Colors - Professional blue-gray palette
  primaryColor: 'blue',
  colors: {
    // Custom professional palette
    dark: [
      '#C9C9C9',
      '#B8B8B8',
      '#828282',
      '#696969',
      '#5C5C5C',
      '#4A4A4A',
      '#3A3A3A',
      '#2C2C2C',
      '#1A1A1A',
      '#0F0F0F',
    ],
  },

  // Spacing
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },

  // Radius - Smooth modern corners
  defaultRadius: 'md',
  radius: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },

  // Shadows - Subtle and professional
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  },

  // Component defaults
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 0.2s ease',
        },
      },
    },
    
    Paper: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },

    Input: {
      defaultProps: {
        radius: 'md',
      },
    },

    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },

    Select: {
      defaultProps: {
        radius: 'md',
      },
    },

    Slider: {
      styles: {
        track: {
          height: 6,
        },
        thumb: {
          width: 16,
          height: 16,
        },
      },
    },

    Modal: {
      defaultProps: {
        radius: 'md',
        shadow: 'xl',
      },
    },

    Notification: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          backdropFilter: 'blur(10px)',
        },
      },
    },
  },

  // Other settings
  focusRing: 'auto',
  activeClassName: 'mantine-active',
  defaultGradient: {
    from: 'blue',
    to: 'cyan',
    deg: 45,
  },
})

export default appTheme

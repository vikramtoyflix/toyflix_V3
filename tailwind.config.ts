import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Pippo-inspired playful colors
				'toy-coral': '#FF6B6B',
				'toy-sunshine': '#FFD93D',
				'toy-mint': '#6BCF7F',
				'toy-purple': '#A8E6CF',
				'toy-peach': '#FFB4A2',
				'toy-sky': '#89CDF1',
				'toy-lavender': '#C5A3FF',
				'toy-orange': '#FFB347',
				// Home page warm neutrals
				'cream': '#FAF7F2',
				'warm-gray': '#5C5346',
				'terracotta': '#C46B4B',
				// Scroll-journey conversion colors
				'hero-cream': '#FEF3E7',
				'learning-blue': '#F1F6FF',
				'trust-mint': '#ECFDF5',
				'warm-cream': '#FFF7ED',
				'hospital-mint': '#E8F8F5',
				'conversion-peach': '#FFE9E2',
				'conversion-cream': '#FFF7ED',
				'footer-slate': '#1F2937',
				'footer-text': '#F9FAFB',
				'cta-coral': '#FF6B3D',
				// Age-based colors
				'age-baby': '#FFE5E5',
				'age-toddler': '#E5F7FF',
				'age-preschool': '#F0FFE5',
				'age-school': '#FFF5E5',
				'age-teen': '#F5E5FF'
			},
			fontFamily: {
				'serif': ['Playfair Display', 'serif'],
				'sans': ['Source Sans Pro', 'sans-serif'],
				'playfair': ['Playfair Display', 'serif'],
				'source': ['Source Sans Pro', 'sans-serif'],
				'outfit': ['Outfit', 'Source Sans Pro', 'sans-serif'],
				'comic': ['Nunito', 'Inter', 'system-ui', 'sans-serif']
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
				'gentle-bounce': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-5px)'
					}
				},
				// Pippo-inspired animations
				'wiggle': {
					'0%, 100%': { transform: 'rotate(-3deg)' },
					'50%': { transform: 'rotate(3deg)' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'pulse-glow': {
					'0%, 100%': { 
						boxShadow: '0 0 5px rgba(255, 107, 107, 0.5)' 
					},
					'50%': { 
						boxShadow: '0 0 20px rgba(255, 107, 107, 0.8)' 
					}
				},
				'trust-pulse': {
					'0%, 100%': { transform: 'scale(1)', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)' },
					'50%': { transform: 'scale(1.04)', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)' }
				},
				'flicker': {
					'0%, 100%': { opacity: '1', filter: 'brightness(1)' },
					'50%': { opacity: '0.92', filter: 'brightness(1.08)' },
					'60%': { opacity: '1', filter: 'brightness(1)' },
					'75%': { opacity: '0.95', filter: 'brightness(1.04)' }
				},
				'trust-icon-shield': {
					'0%, 100%': { transform: 'scale(1)', opacity: '1' },
					'50%': { transform: 'scale(1.08)', opacity: '0.95' }
				},
				'trust-icon-truck': {
					'0%, 100%': { transform: 'translateX(0)' },
					'50%': { transform: 'translateX(4px)' }
				},
				'trust-icon-card': {
					'0%, 100%': { filter: 'brightness(1)' },
					'50%': { filter: 'brightness(1.15)' }
				},
				'wave': {
					'0%, 100%': { transform: 'translateY(0)' },
					'25%': { transform: 'translateY(-5px)' },
					'50%': { transform: 'translateY(0)' },
					'75%': { transform: 'translateY(5px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-down': 'fade-in-down 0.6s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
				'gentle-bounce': 'gentle-bounce 2s ease-in-out infinite',
				'wiggle': 'wiggle 1s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'trust-pulse': 'trust-pulse 2.2s ease-in-out infinite',
				'flicker': 'flicker 2.5s ease-in-out infinite',
				'trust-icon-shield': 'trust-icon-shield 2.5s ease-in-out infinite',
				'trust-icon-truck': 'trust-icon-truck 2s ease-in-out infinite',
				'trust-icon-card': 'trust-icon-card 2.2s ease-in-out infinite',
				'wave': 'wave 2.5s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paypilot: {
          bg: '#F6F7FB',
          surface: '#FFFFFF',
          text: '#15172B',
          muted: '#687086',
          brand: '#635BFF',
          brandHover: '#5148E5',
          navy: '#11142A',
          subtleViolet: '#F0EEFF',
          border: '#E6E8F0',
          success: '#16845B',
          successBg: '#E8F7EF',
          warning: '#B76E00',
          warningBg: '#FFF5DF',
          error: '#C23B48',
          errorBg: '#FFF0F1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(17, 20, 42, 0.04), 0 1px 2px -1px rgba(17, 20, 42, 0.04)',
        card: '0 4px 6px -1px rgba(17, 20, 42, 0.05), 0 2px 4px -2px rgba(17, 20, 42, 0.05)',
        elevated: '0 10px 15px -3px rgba(17, 20, 42, 0.08), 0 4px 6px -4px rgba(17, 20, 42, 0.04)'
      }
    }
  },
  plugins: []
};

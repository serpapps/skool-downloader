// Simple AlertPolyfill for compatibility
export const AlertPolyfill = {
  alert: (message) => {
    console.log('Alert:', message);
    // In browser context, use native alert
    if (typeof alert !== 'undefined') {
      alert(message);
    }
  },
  
  confirm: async (message, type = 'info') => {
    console.log('Confirm:', message, 'type:', type);
    // In browser context, use native confirm
    if (typeof confirm !== 'undefined') {
      return confirm(message);
    }
    // Default to true for automated processing
    return true;
  }
};
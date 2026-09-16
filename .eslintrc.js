module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'react/react-in-jsx-scope': 'off',
    // `void promesse` est délibéré ici : il marque un appel asynchrone qu'on ne
    // veut pas attendre (envoi optimiste, rafraîchissement de fond).
    'no-void': 'off',
  },
  overrides: [
    {
      files: ['jest.setup.js', '**/__tests__/**/*.js'],
      env: { jest: true },
    },
  ],
};

export default {
  test: {
    env: {
      MONGODB_URI: 'mongodb://127.0.0.1:27017/estuda-anne-test',
      JWT_SECRET: 'test_jwt_secret_for_unit_tests_only',
      ADMIN_PASSWORD: 'test_admin_password_123',
    },
  },
};

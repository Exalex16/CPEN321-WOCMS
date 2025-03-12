require("dotenv").config();

module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: __dirname,
    collectCoverage: true,
    collectCoverageFrom: [
        "controllers/**/*.ts", // ✅ Include all backend controllers
        "routes/**/*.ts",      // ✅ Include all route files
        "index.ts",
        "!**/*.test.ts", // Exclude test files
        "!**/node_modules/**", // Exclude node_modules
    ],
    coverageDirectory: "coverage", // ✅ Store coverage in the `coverage/` folder
    detectOpenHandles: true,  // ✅ Show stuck connections
    verbose: true,            // ✅ Show detailed logs
};
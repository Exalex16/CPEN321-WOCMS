require("dotenv").config();

module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.ts"],
    detectOpenHandles: true,  // ✅ Show stuck connections
    verbose: true,            // ✅ Show detailed logs
};
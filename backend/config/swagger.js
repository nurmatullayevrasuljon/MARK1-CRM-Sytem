const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Store Management API",
      version: "1.0.0",
      description: "Store Management REST API",
    },

    servers: [
      {
        url: "https://platform-levitate-fernlike.ngrok-free.dev/api",
        description: "Development Server",
      },
    ],

    components: require("../docs/schemas"),

    security: [
      {
        BearerAuth: [],
      },
    ],
  },

  apis: ["./docs/*.js"],
};

module.exports = swaggerJsdoc(options);

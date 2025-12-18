import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import fs from 'fs';
import path from 'path';

// Load specs from pre-generated openapi.json file
const openApiPath = path.resolve(process.cwd(), 'docs/openapi.json');

const loadedSpecs = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'));

const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Ambitful AI API Documentation',
};

export const setupSwagger = (app: Express): void => {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(loadedSpecs, swaggerUiOptions)
  );
};

export { loadedSpecs as specs, swaggerUi, swaggerUiOptions };

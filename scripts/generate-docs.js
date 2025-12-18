#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DOCS_DIR = path.join(__dirname, '../docs');
const ROUTES_DIR = path.join(DOCS_DIR, 'routes');
const OUTPUT_FILE = path.join(DOCS_DIR, 'openapi.json');

// Base OpenAPI specification
const baseSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Ambitful AI API',
    version: '1.0.0',
    description: 'API for Ambitful AI career opportunities platform providing user authentication, profile management, and opportunity discovery',
    contact: {
      name: 'Ambitful AI Team',
      email: 'support@ambitful.ai'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.API_DEV_URL || 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: process.env.API_STAGING_URL || 'https://api-staging.ambitful.ai',
      description: 'Staging server'
    },
    ...(process.env.NODE_ENV === 'production' && process.env.PROD_API_URL ? [{
      url: process.env.PROD_API_URL,
      description: 'Production server'
    }] : [])
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operation successful'
          },
          data: {
            type: 'object',
            description: 'Response payload'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-17T22:30:00Z'
          },
          requestId: {
            type: 'string',
            example: 'req_123456789'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Bad Request'
          },
          error: {
            type: 'string',
            example: 'Invalid input data'
          },
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-17T22:30:00Z'
          },
          requestId: {
            type: 'string',
            example: 'req_123456789'
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'cm4xyz123'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com'
          },
          name: {
            type: 'string',
            example: 'John Doe'
          },
          avatar: {
            type: 'string',
            nullable: true,
            example: null
          },
          phone: {
            type: 'string',
            nullable: true,
            example: null
          },
          isEmailVerified: {
            type: 'boolean',
            example: false
          },
          jobFunction: {
            type: 'string',
            nullable: true,
            example: null
          },
          preferredLocations: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: []
          },
          workAuthorization: {
            type: 'string',
            nullable: true,
            example: null
          },
          remoteWork: {
            type: 'boolean',
            example: false
          },
          resumeUrl: {
            type: 'string',
            nullable: true,
            example: null
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-17T22:30:00Z'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-17T22:30:00Z'
          }
        }
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'JWT access token'
          },
          user: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: 'cm4xyz123'
              },
              email: {
                type: 'string',
                format: 'email',
                example: 'user@example.com'
              },
              name: {
                type: 'string',
                example: 'John Doe'
              },
              isEmailVerified: {
                type: 'boolean',
                example: false
              }
            }
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com'
          },
          password: {
            type: 'string',
            minLength: 8,
            example: 'Password123!'
          }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com'
          },
          password: {
            type: 'string',
            minLength: 8,
            example: 'Password123!'
          },
          name: {
            type: 'string',
            minLength: 2,
            example: 'John Doe'
          },
          phone: {
            type: 'string',
            example: '+1234567890'
          }
        }
      }
    }
  },
  paths: {}
};

function generateOpenAPISpec() {
  console.log('🔄 Generating OpenAPI specification for Ambitful AI API...');
  
  try {
    // Ensure directories exist
    if (!fs.existsSync(DOCS_DIR)) {
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(ROUTES_DIR)) {
      fs.mkdirSync(ROUTES_DIR, { recursive: true });
      console.log('📁 Created routes directory. Add YAML files for route documentation.');
    }

    // Read all YAML files from routes directory
    const routeFiles = fs.readdirSync(ROUTES_DIR)
      .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

    console.log(`📁 Found ${routeFiles.length} route files:`, routeFiles);

    // Combine all route paths
    for (const file of routeFiles) {
      const filePath = path.join(ROUTES_DIR, file);
      const yamlContent = fs.readFileSync(filePath, 'utf8');
      
      try {
        const routeSpec = yaml.load(yamlContent);
        
        if (routeSpec && routeSpec.paths) {
          // Merge paths from this file
          Object.assign(baseSpec.paths, routeSpec.paths);
          console.log(`✅ Processed ${file} - Added ${Object.keys(routeSpec.paths).length} paths`);
        }
        
        // Merge additional schemas if they exist
        if (routeSpec && routeSpec.components && routeSpec.components.schemas) {
          Object.assign(baseSpec.components.schemas, routeSpec.components.schemas);
          console.log(`📋 Added schemas from ${file}`);
        }
      } catch (parseError) {
        console.warn(`⚠️  Warning: Could not parse ${file}:`, parseError.message);
      }
    }

    // Write the combined specification to openapi.json
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(baseSpec, null, 2));
    
    const pathCount = Object.keys(baseSpec.paths).length;
    const schemaCount = Object.keys(baseSpec.components.schemas).length;
    
    console.log(`✅ Ambitful AI API OpenAPI specification generated successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Paths: ${pathCount}`);
    console.log(`   - Schemas: ${schemaCount}`);
    console.log(`   - Output: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('❌ Error generating OpenAPI specification:', error);
    process.exit(1);
  }
}

// Run the generator
if (require.main === module) {
  generateOpenAPISpec();
}

module.exports = { generateOpenAPISpec };
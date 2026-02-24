/**
 * JSON Schema validator for forest skills.
 */

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';

import { FOREST_SCHEMAS, hasForestSchema } from './forest-schemas';

export interface ForestValidationError {
  instancePath: string;
  message: string;
}

export interface ForestValidationResult {
  valid: boolean;
  errors: ForestValidationError[];
}

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
  useDefaults: true,
});

for (const [schemaRef, schema] of Object.entries(FOREST_SCHEMAS)) {
  const withId = schema.$id ? schema : { ...schema, $id: schemaRef };
  ajv.addSchema(withId, schemaRef);
}

const validatorCache = new Map<string, ValidateFunction>();

function formatErrors(errors?: ErrorObject[] | null): ForestValidationError[] {
  if (!errors || errors.length === 0) return [];
  return errors.map((err) => ({
    instancePath: err.instancePath || '/',
    message: err.message || 'schema validation failed',
  }));
}

export function validateForestSchema(
  schemaRef: string,
  data: any,
): ForestValidationResult {
  if (!hasForestSchema(schemaRef)) {
    return {
      valid: false,
      errors: [
        {
          instancePath: '/',
          message: `schema not found: ${schemaRef}`,
        },
      ],
    };
  }

  let validator = validatorCache.get(schemaRef);
  if (!validator) {
    validator = ajv.getSchema(schemaRef);
    if (!validator) {
      validator = ajv.compile({ $ref: schemaRef });
    }
    validatorCache.set(schemaRef, validator);
  }

  const valid = validator(data);
  return {
    valid: !!valid,
    errors: formatErrors(validator.errors),
  };
}

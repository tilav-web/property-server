import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

type FileField = {
  name: string;
  isArray?: boolean;
  required?: boolean;
};

function fileProperty(field: FileField) {
  const fileSchema = { type: 'string', format: 'binary' };
  return field.isArray ? { type: 'array', items: fileSchema } : fileSchema;
}

export function ApiMultipartBody(dto: Type<unknown>, fields: FileField[]) {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiExtraModels(dto),
    ApiBody({
      schema: {
        allOf: [
          { $ref: getSchemaPath(dto) },
          {
            type: 'object',
            properties: Object.fromEntries(
              fields.map((field) => [field.name, fileProperty(field)]),
            ),
            required: fields
              .filter((field) => field.required)
              .map((field) => field.name),
          },
        ],
      },
    }),
  );
}

import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

type SchemaLike = Record<string, unknown>;

const ERROR_SCHEMA: SchemaLike = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    message: { type: 'string' },
    code: {
      type: 'string',
      description: "Mashinada o'qiladigan xato kodi (ixtiyoriy)",
    },
    errors: {
      type: 'array',
      description:
        "Validatsiya yoki ko'p sohali xatolar uchun ixtiyoriy ro'yxat",
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  required: ['statusCode', 'message'],
};

type ErrorKind =
  | 'badRequest'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'tooMany'
  | 'serverError';

const DEFAULT_MESSAGES: Record<ErrorKind, string> = {
  badRequest: "Ma'lumotlarni to'g'ri kiritish kerak",
  unauthorized:
    "Avtorizatsiyadan o'tilmagan: token yo'q, muddati o'tgan yoki noto'g'ri",
  forbidden: 'Bu amalni bajarishga ruxsat yo‘q',
  notFound: "So'ralgan resurs topilmadi",
  conflict: 'Bunday qiymat allaqachon mavjud',
  tooMany: "Juda ko'p so'rov yuborildi. Birozdan so'ng qayta urinib ko'ring",
  serverError: 'Ichki server xatoligi',
};

const STATUS_CODES: Record<ErrorKind, HttpStatus> = {
  badRequest: HttpStatus.BAD_REQUEST,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  notFound: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  tooMany: HttpStatus.TOO_MANY_REQUESTS,
  serverError: HttpStatus.INTERNAL_SERVER_ERROR,
};

function example(kind: ErrorKind, message?: string) {
  return {
    statusCode: STATUS_CODES[kind],
    message: message ?? DEFAULT_MESSAGES[kind],
  };
}

export interface StandardErrorsOptions {
  /** 401 yoqilsinmi (default: false) */
  auth?: boolean;
  /** 403 yoqilsinmi (default: false) */
  forbidden?: boolean;
  /** 404 yoqilsinmi (default: false) */
  notFound?: boolean;
  /** 409 yoqilsinmi (default: false) */
  conflict?: boolean;
  /** 429 yoqilsinmi (default: false). Throttler ishlatilgan endpointlarda yoqing. */
  throttle?: boolean;
  /** 400 yoqilsinmi (default: true). DTO/body bor endpointlar uchun. */
  validation?: boolean;
  /** 500 yoqilsinmi (default: true) */
  serverError?: boolean;
  /** Maxsus xabarlar bilan yopish (description). */
  messages?: Partial<Record<ErrorKind, string>>;
}

/**
 * Bir nechta standart error response decoratorlarini birlashtiruvchi helper.
 * Format: { statusCode, message, code?, errors? } — global filter chiqaradigan ko'rinish.
 *
 * Misol:
 *   @ApiStandardErrors({ auth: true, notFound: true, validation: true })
 */
export function ApiStandardErrors(options: StandardErrorsOptions = {}) {
  const {
    auth = false,
    forbidden = false,
    notFound = false,
    conflict = false,
    throttle = false,
    validation = true,
    serverError = true,
    messages = {},
  } = options;

  const decorators: MethodDecorator[] = [];

  if (validation) {
    decorators.push(
      ApiBadRequestResponse({
        description: messages.badRequest ?? DEFAULT_MESSAGES.badRequest,
        schema: {
          ...ERROR_SCHEMA,
          example: example('badRequest', messages.badRequest),
        },
      }),
    );
  }
  if (auth) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: messages.unauthorized ?? DEFAULT_MESSAGES.unauthorized,
        schema: {
          ...ERROR_SCHEMA,
          example: example('unauthorized', messages.unauthorized),
        },
      }),
    );
  }
  if (forbidden) {
    decorators.push(
      ApiForbiddenResponse({
        description: messages.forbidden ?? DEFAULT_MESSAGES.forbidden,
        schema: {
          ...ERROR_SCHEMA,
          example: example('forbidden', messages.forbidden),
        },
      }),
    );
  }
  if (notFound) {
    decorators.push(
      ApiNotFoundResponse({
        description: messages.notFound ?? DEFAULT_MESSAGES.notFound,
        schema: {
          ...ERROR_SCHEMA,
          example: example('notFound', messages.notFound),
        },
      }),
    );
  }
  if (conflict) {
    decorators.push(
      ApiConflictResponse({
        description: messages.conflict ?? DEFAULT_MESSAGES.conflict,
        schema: {
          ...ERROR_SCHEMA,
          example: example('conflict', messages.conflict),
        },
      }),
    );
  }
  if (throttle) {
    decorators.push(
      ApiTooManyRequestsResponse({
        description: messages.tooMany ?? DEFAULT_MESSAGES.tooMany,
        schema: {
          ...ERROR_SCHEMA,
          example: example('tooMany', messages.tooMany),
        },
      }),
    );
  }
  if (serverError) {
    decorators.push(
      ApiInternalServerErrorResponse({
        description: messages.serverError ?? DEFAULT_MESSAGES.serverError,
        schema: {
          ...ERROR_SCHEMA,
          example: example('serverError', messages.serverError),
        },
      }),
    );
  }

  return applyDecorators(...decorators);
}

/** Schema'larni boshqa joyda qayta ishlatish uchun export. */
export const ERROR_RESPONSE_SCHEMA = ERROR_SCHEMA;

/** Type uchun yordamchi (DTO sifatida ishlatilishi mumkin). */
export class ApiErrorResponseDto {
  statusCode!: number;
  message!: string;
  code?: string;
  errors?: Array<{ field: string; message?: string }>;
}

// `Type<unknown>` reference saqlanadi, agar kelajakda ApiResponse({ type: ... })
// uchun kerak bo'lsa.
export const ApiErrorResponseType: Type<ApiErrorResponseDto> =
  ApiErrorResponseDto;

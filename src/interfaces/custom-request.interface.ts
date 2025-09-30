import { Request } from 'express';
import { EnumRole } from 'src/enums/role.enum';

export interface IRequestCustom extends Request {
  user?: {
    _id: string;
    role: EnumRole;
  };
}

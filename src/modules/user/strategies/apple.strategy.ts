import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('APPLE_CLIENT_ID');
    const teamID = configService.get<string>('APPLE_TEAM_ID');
    const keyID = configService.get<string>('APPLE_KEY_ID');
    const privateKey = configService.get<string>('APPLE_PRIVATE_KEY');
    const callbackURL = configService.get<string>('APPLE_CALLBACK_URL');

    if (!clientID || !teamID || !keyID || !privateKey || !callbackURL) {
      throw new Error(
        'APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, and APPLE_CALLBACK_URL must be defined in the .env file.',
      );
    }

    super({
      clientID,
      teamID,
      keyID,
      privateKeyString: privateKey, // Attempting with privateKeyString
      callbackURL,
      scope: ['name', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { id, name, email } = profile;
    const user = {
      provider: 'apple',
      providerId: id,
      email: email,
      firstName: name.firstName,
      lastName: name.lastName,
      accessToken,
    };
    done(null, user);
  }
}

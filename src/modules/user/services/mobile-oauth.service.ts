import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface VerifiedGoogleProfile {
  provider: 'google';
  providerId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  picture?: string;
}

export interface VerifiedAppleProfile {
  provider: 'apple';
  providerId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
}

/**
 * Mobile native SDK'lardan kelgan ID Token'larni verify qiluvchi service.
 *
 * Google va Apple uchun alohida verify mantiqi - har bir provider o'z
 * JWKS (public keys) bilan token tekshiradi.
 */
@Injectable()
export class MobileOAuthService {
  private readonly logger = new Logger(MobileOAuthService.name);
  private readonly googleClient: OAuth2Client;
  private readonly appleJWKS = createRemoteJWKSet(
    new URL('https://appleid.apple.com/auth/keys'),
  );

  constructor() {
    this.googleClient = new OAuth2Client();
  }

  /**
   * Google ID Token'ni verify qiladi.
   *
   * Audience (aud) field GOOGLE_CLIENT_ID lardan biri bo'lishi kerak.
   * iOS va Android ilovalar har xil client ID ishlatishi mumkin — shuning
   * uchun GOOGLE_MOBILE_CLIENT_IDS env vergul orqali bir nechta qabul qiladi.
   *
   * Misol GOOGLE_MOBILE_CLIENT_IDS:
   *   xxx.apps.googleusercontent.com,yyy.apps.googleusercontent.com
   */
  async verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
    const allowedAudiences = this.getGoogleAllowedAudiences();
    if (allowedAudiences.length === 0) {
      throw new InternalServerErrorException(
        "Google OAuth sozlanmagan: GOOGLE_CLIENT_ID yoki GOOGLE_MOBILE_CLIENT_IDS env yo'q",
      );
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: allowedAudiences,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException("Google token payload bo'sh");
      }

      const { sub, email, email_verified, given_name, family_name, picture } =
        payload;

      if (!sub || !email) {
        throw new UnauthorizedException(
          'Google token yaroqsiz: sub yoki email yo‘q',
        );
      }

      return {
        provider: 'google',
        providerId: sub,
        email,
        emailVerified: Boolean(email_verified),
        firstName: given_name ?? '',
        lastName: family_name ?? '',
        picture,
      };
    } catch (err) {
      this.logger.warn(
        `Google ID Token verify xato: ${(err as Error).message}`,
      );
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Google token noto'g'ri yoki muddati o'tgan");
    }
  }

  /**
   * Apple identityToken verify (Sign in with Apple).
   *
   * Apple JWT'ni https://appleid.apple.com/auth/keys JWKS orqali verify
   * qiladi. Private key kerak emas — faqat APPLE_CLIENT_ID (Bundle ID) va
   * Apple'ning ochiq kalitlari yetarli.
   *
   * firstName/lastName faqat birinchi loginда Apple tomonidan qaytariladi —
   * keyingi loginlarda yo'q. Shuning uchun fullName ixtiyoriy.
   */
  async verifyAppleIdentityToken(
    identityToken: string,
    fullName?: string,
  ): Promise<VerifiedAppleProfile> {
    const clientId = process.env.APPLE_CLIENT_ID?.trim();
    if (!clientId) {
      throw new InternalServerErrorException(
        "Apple OAuth sozlanmagan: APPLE_CLIENT_ID env yo'q",
      );
    }

    try {
      const { payload } = await jwtVerify(identityToken, this.appleJWKS, {
        issuer: 'https://appleid.apple.com',
        audience: clientId,
      });

      const sub = payload.sub as string | undefined;
      const email = payload.email as string | undefined;
      const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

      if (!sub) {
        throw new UnauthorizedException('Apple token yaroqsiz: sub yo\'q');
      }

      // fullName faqat birinchi loginда keladi — bo'sh string bo'lishi mumkin
      const [firstName, ...rest] = (fullName ?? '').trim().split(' ');

      return {
        provider: 'apple',
        providerId: sub,
        email: email ?? `${sub}@privaterelay.appleid.com`,
        emailVerified,
        firstName: firstName || undefined,
        lastName: rest.join(' ') || undefined,
      };
    } catch (err) {
      this.logger.warn(
        `Apple identityToken verify xato: ${(err as Error).message}`,
      );
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(
        "Apple token noto'g'ri yoki muddati o'tgan",
      );
    }
  }

  private getGoogleAllowedAudiences(): string[] {
    const ids = new Set<string>();
    const web = process.env.GOOGLE_CLIENT_ID?.trim();
    if (web) ids.add(web);
    const mobile = process.env.GOOGLE_MOBILE_CLIENT_IDS;
    if (mobile) {
      mobile
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((id) => ids.add(id));
    }
    return Array.from(ids);
  }
}

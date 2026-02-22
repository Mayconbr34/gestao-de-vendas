import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')
    });
  }

  async validate(payload: { sub: string; email: string; role?: string; companyId?: string | null }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId ?? null
    };
  }
}

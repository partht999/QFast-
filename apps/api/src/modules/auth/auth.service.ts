import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '@qfast/shared';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(pass, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      expiresIn: '7d',
    });

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefresh,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, role: UserRole.OWNER },
    });

    return this.login(user);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let validToken: (typeof tokens)[0] | null = null;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.token)) {
        validToken = t;
        break;
      }
    }

    if (!validToken) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.update({
      where: { id: validToken.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.login(user);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

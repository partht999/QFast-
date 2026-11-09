import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '@qfast/shared';
import { UserRole } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mail: MailService,
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

  async sendRegistrationOtp(email: string) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) throw new ConflictException('Email already registered');

    const latest = await this.prisma.emailOtp.findFirst({
      where: { email: normalized, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < 60_000) {
      throw new BadRequestException('Wait a minute before requesting another code.');
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);
    await this.mail.sendRegistrationOtp(normalized, code);
    await this.prisma.emailOtp.create({
      data: {
        email: normalized,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    return { message: 'Verification code sent' };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');
    await this.consumeRegistrationOtp(email, dto.otp);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, role: UserRole.OWNER },
    });

    return this.login(user);
  }

  private async consumeRegistrationOtp(email: string, otp: string) {
    const record = await this.prisma.emailOtp.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new BadRequestException('Request a verification code for this email first.');
    }
    if (record.attempts >= 5) {
      throw new BadRequestException('Too many incorrect codes. Request a new one.');
    }

    const matches = await bcrypt.compare(otp, record.codeHash);
    if (!matches) {
      await this.prisma.emailOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('That code does not match. Check the email and try again.');
    }

    await this.prisma.emailOtp.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
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

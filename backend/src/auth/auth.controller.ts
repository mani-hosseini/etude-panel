import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  Public,
  Roles,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import { AuthService } from './auth.service';
import {
  AdminLoginDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterStudentDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ورود هنرجو' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginStudent(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'ثبت‌نام عمومی هنرجو' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.registerPublic(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ورود ادمین' })
  adminLogin(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.authService.loginAdmin(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Roles(Role.ADMIN)
  @Post('register/student')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ثبت هنرجو توسط ادمین' })
  registerStudent(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تازه‌سازی Access Token' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('توکن تازه‌سازی الزامی است.');
    }
    return this.authService.refresh(dto.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'خروج' })
  logout(@CurrentUser() user: AuthUser, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'نشست جاری' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user);
  }
}

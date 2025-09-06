import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';

class GoogleAuthDto {
  @IsString()
  id_token!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('google')
  async google(@Body() body: GoogleAuthDto) {
    const payload = await this.auth.verifyGoogleIdToken(body.id_token);
    const user = await this.auth.upsertUserFromGoogle(payload);
    const token = await this.auth.issueAppJwt({ id: user.id, email: user.email });
    return { token, user };
  }
}

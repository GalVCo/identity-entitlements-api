import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

class GoogleAuthDto {
  id_token!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  // Placeholder for PR #3
  @Post('google')
  async google(@Body() _body: GoogleAuthDto) {
    return {
      message: 'Not implemented yet (PR #3 will handle Google id_token verification)'
    };
  }
}


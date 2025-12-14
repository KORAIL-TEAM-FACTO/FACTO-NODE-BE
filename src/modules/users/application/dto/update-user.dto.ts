import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Update User DTO
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe', description: '사용자 이름' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: '이메일 주소',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

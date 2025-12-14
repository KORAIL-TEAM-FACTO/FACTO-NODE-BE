import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Create User DTO
 */
export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: '사용자 이름' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'john@example.com', description: '이메일 주소' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});

let prisma: PrismaClient | null = null;

const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export class AuthService {
  static async login(email: string, password: string) {
    const { email: validEmail, password: validPassword } = loginSchema.parse({
      email,
      password
    });

    const client = getPrisma();
    const user = await client.user.findUnique({
      where: { email: validEmail }
    });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    const isValidPassword = await bcrypt.compare(validPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Credenciais inválidas');
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev',
      { expiresIn: '1h' }
    );

    return { token };
  }

  static async register(email: string, password: string) {
    const { email: validEmail, password: validPassword } = loginSchema.parse({
      email,
      password
    });

    const client = getPrisma();
    const hashedPassword = await bcrypt.hash(validPassword, 10);
    const user = await client.user.create({
      data: { email: validEmail, password: hashedPassword }
    });

    return { id: user.id };
  }
}

import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService password security', () => {
  const user = {
    id: 'student-1',
    role: Role.STUDENT,
    nationalId: '1234567890',
    firstName: 'Test',
    lastName: 'Student',
    displayName: 'Test Student',
    passwordHash: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('resets the password using only a hash, never plaintext', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const service = new UsersService(prisma as never);
    const result = await service.resetPassword(user.id, { password: 'new-password-123' });
    expect(result).toEqual({ reset: true });
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(Object.keys(data)).toEqual(['passwordHash']);
    expect(data).not.toHaveProperty('passwordPlain');
    await expect(argon2.verify(data.passwordHash, 'new-password-123')).resolves.toBe(true);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });
});

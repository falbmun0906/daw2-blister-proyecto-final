import { Types } from 'mongoose';

import { BlisterModel } from '../../../models/blister.model';
import { UserModel } from '../../../models/user.model';
import {
  blistersCreate,
  blistersCreateInvite,
  blistersDelete,
  blistersJoin,
  blistersList,
  blistersListMembers,
  blistersRemoveMember,
  blistersUpdate,
} from '../blisters.service';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';

describe('blisters.service', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  const createUser = async (suffix: string) =>
    UserModel.create({
      name: `User ${suffix}`,
      username: `user${suffix}`,
      email: `user${suffix}@example.com`,
      password:
        '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

  it('lists only active blisters for the authenticated user', async () => {
    const user = await createUser('1');
    await BlisterModel.create({
      name: 'Activo',
      members: [{ userId: user._id, role: 'OWNER' }],
    });
    await BlisterModel.create({
      name: 'Borrado',
      members: [{ userId: user._id, role: 'OWNER' }],
      deletedAt: new Date(),
    });

    const result = await blistersList(user._id.toString());

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Activo');
  });

  it('creates a blister with the authenticated user as owner', async () => {
    const user = await createUser('2');

    const result = await blistersCreate(user._id.toString(), {
      name: 'Casa Abuela',
    });

    expect(result.name).toBe('Casa Abuela');
    expect(result.members[0]).toEqual({
      userId: user._id.toString(),
      role: 'OWNER',
    });
  });

  it('updates and soft deletes a blister for owners', async () => {
    const user = await createUser('3');
    const blister = await BlisterModel.create({
      name: 'Inicial',
      members: [{ userId: user._id, role: 'OWNER' }],
    });

    const updated = await blistersUpdate(blister._id.toString(), user._id.toString(), {
      name: 'Renombrado',
    });
    await blistersDelete(blister._id.toString(), user._id.toString());
    const stored = await BlisterModel.findById(blister._id);

    expect(updated.name).toBe('Renombrado');
    expect(stored?.deletedAt).toBeInstanceOf(Date);
  });

  it('creates an invite and joins another user through the code', async () => {
    const owner = await createUser('4');
    const invited = await createUser('5');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });

    const invite = await blistersCreateInvite(blister._id.toString(), owner._id.toString(), {
      role: 'CAREgiver'.toUpperCase() as 'CAREGIVER',
    });
    const joined = await blistersJoin(invited._id.toString(), {
      code: invite.code,
    });

    expect(joined.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: invited._id.toString(),
          role: 'CAREGIVER',
        }),
      ]),
    );
  });

  it('lists members for authenticated blister members', async () => {
    const owner = await createUser('6');
    const member = await createUser('7');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: member._id, role: 'OBSERVER' },
      ],
    });

    const members = await blistersListMembers(blister._id.toString(), member._id.toString());

    expect(members).toHaveLength(2);
  });

  it('creates a safety personal blister when expelling the only blister of a member', async () => {
    const owner = await createUser('8');
    const member = await createUser('9');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: member._id, role: 'CAREGIVER' },
      ],
    });

    await blistersRemoveMember(blister._id.toString(), owner._id.toString(), member._id.toString());

    const memberBlisters = await BlisterModel.find({
      deletedAt: null,
      members: {
        $elemMatch: {
          userId: member._id,
        },
      },
    });

    expect(memberBlisters).toHaveLength(1);
    expect(memberBlisters[0].name).toBe('Mi blíster');
    expect(memberBlisters[0].members[0].role).toBe('OWNER');
  });

  it('blocks removing the last owner from a blister', async () => {
    const owner = await createUser('10');
    const caregiver = await createUser('11');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
      ],
    });

    await expect(
      blistersRemoveMember(blister._id.toString(), owner._id.toString(), owner._id.toString()),
    ).rejects.toMatchObject({
      code: 'BLISTER_OWNER_PROTECTION',
    });
  });
});

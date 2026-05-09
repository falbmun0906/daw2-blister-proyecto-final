import { blistersListMembers } from '../../modules/blisters/blisters.service';
import { resolveMcpBlister } from '../blister-resolver';
import { type McpBlisterMember, type McpBlisterMembersTool } from '../types';

const toMcpMember = (
  member: { userId: string; role: McpBlisterMember['role']; fullName: string; username: string; avatarKey: string | null },
  currentUserId: string,
): McpBlisterMember => ({
  userId: member.userId,
  role: member.role,
  fullName: member.fullName,
  username: member.username,
  avatarKey: member.avatarKey,
  isCurrentUser: member.userId === currentUserId,
});

export const blisterMembersTool: McpBlisterMembersTool = {
  name: 'blister_members',
  description:
    'Lista miembros y roles de un blister accesible por id o nombre exacto, útil para responder quién pertenece al blister y cuál es el rol real del usuario conectado.',
  run: async (context, input) => {
    const blister = resolveMcpBlister(context, input);
    const members = await blistersListMembers(blister.blisterId, context.userId);
    const mappedMembers = members.map((member) => toMcpMember(member, context.userId));

    return {
      blister: {
        blisterId: blister.blisterId,
        blisterName: blister.blisterName,
        role: blister.role,
        memberCount: mappedMembers.length,
      },
      members: mappedMembers,
    };
  },
};
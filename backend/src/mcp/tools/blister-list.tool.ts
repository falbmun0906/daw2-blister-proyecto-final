import { type BlisterListInput } from '../../../../shared/schemas';
import { blistersList } from '../../modules/blisters/blisters.service';
import { type McpBlisterListTool, type McpBlisterMember, type McpBlisterSummary } from '../types';

const normalizeText = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const matchesSearchText = (input: BlisterListInput, blisterName: string): boolean => {
  if (!input.text) {
    return true;
  }

  return normalizeText(blisterName).includes(normalizeText(input.text));
};

const toMcpMember = (
  member: { userId: string; role: McpBlisterMember['role']; fullName?: string; username?: string; avatarKey?: string | null },
  currentUserId: string,
): McpBlisterMember => ({
  userId: member.userId,
  role: member.role,
  fullName: member.fullName ?? '',
  username: member.username ?? '',
  avatarKey: member.avatarKey ?? null,
  isCurrentUser: member.userId === currentUserId,
});

export const blisterListTool: McpBlisterListTool = {
  name: 'blister_list',
  description:
    'Lista los blisters accesibles por el usuario MCP, incluyendo su rol real y contadores para resolver contexto antes de consultar inventario, miembros o citas.',
  run: async (context, input) => {
    const blisters = await blistersList(context.userId);
    const items = blisters
      .filter((blister) => matchesSearchText(input, blister.name))
      .map<McpBlisterSummary>((blister) => {
        const contextBlister = context.blisters.find((entry) => entry.blisterId === blister._id);
        const members = blister.members.map((member) => toMcpMember(member, context.userId));

        return {
          blisterId: blister._id,
          blisterName: blister.name,
          role: contextBlister?.role ?? members.find((member) => member.isCurrentUser)?.role ?? 'OBSERVER',
          avatarKey: blister.avatarKey ?? null,
          memberCount: blister.members.length,
          medicinesCount: blister.medicinesCount ?? 0,
          treatmentsCount: blister.treatmentsCount ?? 0,
          ...(input.includeMembers ? { members } : {}),
        };
      })
      .sort((left, right) => left.blisterName.localeCompare(right.blisterName, 'es'));

    return { items };
  },
};
import { handleSecurityEvent } from '../services/pipeline/pipeline.js';
import type { Client } from 'discord.js';
import { AuditActionWeights } from '../config/constants.js';
import type { SecurityEvent } from '../services/audit/types.js';
import { randomUUID } from 'node:crypto';

function makeEvent(
  guildId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  raw?: unknown
): SecurityEvent {
  return {
    id: randomUUID(),
    guildId,
    action,
    resourceType,
    resourceId,
    executorId: undefined,
    weight: AuditActionWeights[action] ?? 0,
    timestamp: Date.now(),
    raw,
  };
}

function getChannelName(channel: { name?: string }): string | undefined {
  return channel.name;
}

export function registerEventHandlers(client: Client): void {
  client.on('guildUpdate', (oldGuild, newGuild) => {
    void handleSecurityEvent(client, makeEvent(newGuild.id, 'GUILD_UPDATE', 'GUILD', newGuild.id, { old: oldGuild.name, new: newGuild.name }));
  });

  client.on('roleCreate', (role) => {
    void handleSecurityEvent(client, makeEvent(role.guild.id, 'ROLE_CREATE', 'ROLE', role.id, { name: role.name }));
  });

  client.on('roleDelete', (role) => {
    void handleSecurityEvent(client, makeEvent(role.guild.id, 'ROLE_DELETE', 'ROLE', role.id, { name: role.name }));
  });

  client.on('roleUpdate', (oldRole, newRole) => {
    void handleSecurityEvent(client, makeEvent(newRole.guild.id, 'ROLE_UPDATE', 'ROLE', newRole.id, { old: oldRole.name, new: newRole.name }));
  });

  client.on('channelCreate', (channel) => {
    if (!('guild' in channel) || channel.isThread() || channel.isDMBased()) return;
    void handleSecurityEvent(client, makeEvent(channel.guild.id, 'CHANNEL_CREATE', 'CHANNEL', channel.id, { name: getChannelName(channel) }));
  });

  client.on('channelDelete', (channel) => {
    if (!('guild' in channel) || channel.isThread() || channel.isDMBased()) return;
    void handleSecurityEvent(client, makeEvent(channel.guild.id, 'CHANNEL_DELETE', 'CHANNEL', channel.id, { name: getChannelName(channel) }));
  });

  client.on('channelUpdate', (oldChannel, newChannel) => {
    if (!('guild' in newChannel) || newChannel.isThread() || newChannel.isDMBased() || oldChannel.isDMBased()) return;
    void handleSecurityEvent(client, makeEvent(newChannel.guild.id, 'CHANNEL_UPDATE', 'CHANNEL', newChannel.id, { old: getChannelName(oldChannel), new: getChannelName(newChannel) }));
  });

  client.on('guildMemberUpdate', (oldMember, newMember) => {
    const oldRoles = oldMember.roles.cache.map((r) => r.id);
    const newRoles = newMember.roles.cache.map((r) => r.id);
    if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
      void handleSecurityEvent(client, makeEvent(newMember.guild.id, 'MEMBER_ROLE_UPDATE', 'MEMBER', newMember.id, { oldRoles, newRoles }));
    }
  });

  client.on('guildBanAdd', (ban) => {
    void handleSecurityEvent(client, makeEvent(ban.guild.id, 'MEMBER_BAN_ADD', 'MEMBER', ban.user.id, { user: ban.user.tag }));
  });

  client.on('guildMemberRemove', (member) => {
    void handleSecurityEvent(client, makeEvent(member.guild.id, 'MEMBER_KICK', 'MEMBER', member.id, { user: member.user?.tag }));
  });

  client.on('emojiCreate', (emoji) => {
    if (!emoji.guild) return;
    void handleSecurityEvent(client, makeEvent(emoji.guild.id, 'EMOJI_CREATE', 'EMOJI', emoji.id, { name: emoji.name }));
  });

  client.on('emojiDelete', (emoji) => {
    if (!emoji.guild) return;
    void handleSecurityEvent(client, makeEvent(emoji.guild.id, 'EMOJI_DELETE', 'EMOJI', emoji.id, { name: emoji.name }));
  });

  client.on('emojiUpdate', (oldEmoji, newEmoji) => {
    if (!newEmoji.guild) return;
    void handleSecurityEvent(client, makeEvent(newEmoji.guild.id, 'EMOJI_UPDATE', 'EMOJI', newEmoji.id, { old: oldEmoji.name, new: newEmoji.name }));
  });

  client.on('stickerCreate', (sticker) => {
    if (!sticker.guild) return;
    void handleSecurityEvent(client, makeEvent(sticker.guild.id, 'STICKER_CREATE', 'STICKER', sticker.id, { name: sticker.name }));
  });

  client.on('stickerDelete', (sticker) => {
    if (!sticker.guild) return;
    void handleSecurityEvent(client, makeEvent(sticker.guild.id, 'STICKER_DELETE', 'STICKER', sticker.id, { name: sticker.name }));
  });

  client.on('stickerUpdate', (oldSticker, newSticker) => {
    if (!newSticker.guild) return;
    void handleSecurityEvent(client, makeEvent(newSticker.guild.id, 'STICKER_UPDATE', 'STICKER', newSticker.id, { old: oldSticker.name, new: newSticker.name }));
  });

  client.on('webhooksUpdate', ({ guild }) => {
    void handleSecurityEvent(client, makeEvent(guild.id, 'WEBHOOK_CHANGE', 'WEBHOOK', undefined, {}));
  });
}

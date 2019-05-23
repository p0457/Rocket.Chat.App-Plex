import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { AppPersistence } from '../persistence';
import { sendAttachmentNotification } from './sendAttachmentNotification';

export async function sendTokenExpired(read: IRead, modify: IModify, user: IUser, room: IRoom, persis: IPersistence): Promise<void> {
  const persistence = new AppPersistence(persis, read.getPersistenceReader());
  const userThumbUrl = await persistence.getUserThumb(user);
  await sendAttachmentNotification({
    collapsed: false,
    color: '#e10000',
    thumbnailUrl: userThumbUrl,
    title: {
      value: 'Token Expired!',
      link: 'https://app.plex.tv/desktop#!/account',
    },
    text: 'Please login again using `/plex login [USERNAME] [PASSWORD]`',
  }, read, modify, user, room);
}

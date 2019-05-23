import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { sendAttachmentNotification } from './sendAttachmentNotification';

export async function sendServerDetailsNotification(server, userThumbUrl: string | undefined, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  let text = '*v' + server.version + '*\n*Owner: *';
  text += (server.owned && server.owned === true) ? 'You' : server.sourceTitle;
  // tslint:disable-next-line:max-line-length
  const userThumbUrlActual = (server.owned && server.owned === true) ? userThumbUrl : 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Antu_im-invisible-user.svg/512px-Antu_im-invisible-user.svg.png';
  const serverAddress = server.scheme + '://' + server.address + ':' + server.port;
  await sendAttachmentNotification({
    collapsed: false,
    color: '#e4a00e',
    thumbnailUrl: userThumbUrlActual,
    title: {
      value: server.name,
      link: serverAddress,
    },
    text,
  }, read, modify, user, room);
}

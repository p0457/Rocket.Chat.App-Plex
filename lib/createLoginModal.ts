import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';
import { AppPersistence } from './persistence';

import { uuid } from './helpers/uuid';

export async function createLoginModal({ id = '', persis, data, read, modify }: {
    id?: string,
    persis: IPersistence,
    data,
    read: IRead, 
    modify: IModify
}): Promise<IUIKitModalViewParam> {
    const viewId = id || uuid();

    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, viewId);
    await persis.createWithAssociation({ room: data.room }, association);

    const block = modify.getCreator().getBlockBuilder();
    block.addInputBlock({
        blockId: 'plexlogin',
        element: block.newPlainTextInputElement({ 
            actionId: 'username',
            placeholder: block.newPlainTextObject('Username')
        }),
        label: block.newPlainTextObject('Plex Username'),
    });
    block.addInputBlock({
        blockId: 'plexpassword',
        /* 
            Would like a password element input to obscure text entered
            Would also like a way to import modules for use with encrypting these values, at least minimally
        */
        element: block.newPlainTextInputElement({ 
            actionId: 'password',
            placeholder: block.newPlainTextObject('Password')
        }),
        label: block.newPlainTextObject('Plex Password'),
    });

    return {
        id: viewId,
        title: block.newPlainTextObject('Login to Plex'),
        submit: block.newButtonElement({
            text: block.newPlainTextObject('Login'),
        }),
        close: block.newButtonElement({
            text: block.newPlainTextObject('Dismiss'),
        }),
        blocks: block.getBlocks(),
    };
}

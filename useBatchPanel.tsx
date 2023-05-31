import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { useAppDispatch } from '../../../store/redux';
import { clearBatch, selectBatch, selectItem } from '../../../store/reducers/batchSlice';
import { EventDataNode, DataNode } from 'antd/lib/tree';
import { message } from 'antd';
import { FileDoneOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import Styles from './BatchPanel.module.scss';
import { clearPage, selectPage, setSelectedPageId, setSelectedPagePos } from '../../../store/reducers/pageSlice';
import { pageService, useGetPageQuery } from '../../../services/pageService';
import { IBatch } from '../../../services/interface/IService';
import { setBatch } from 'react-redux/es/utils/batch';
import { batchLevel } from '../../../constants';

interface IInfo {
    event: 'select';
    selected: boolean;
    node: EventDataNode<any>;
    selectedNodes: any[];
    nativeEvent: MouseEvent;
}

interface IUseBatchPanel {
    treeData: DataNode[];
    selectedNode: DataNode | null;
    visible: boolean;
    setVisible: React.Dispatch<React.SetStateAction<boolean>>;
    onSelect: (selectedKeysValue: React.Key[], info: IInfo) => void;
    onRightClick: (info: {event: React.MouseEvent; node: EventDataNode<any>}) => void;
    handleMenuClick: () => void;
    clearBatchPanel: () => void;
}

const defaultData: DataNode[] = [
    // {
    //     title: 'Пачка',
    //     key: '0',
    //     children: [
    //         {
    //             title: 'Папка 1',
    //             key: '0-0',
    //             children: [
    //                 {
    //                     title: 'Документы 1',
    //                     key: '0-0-0',
    //                     children: [
    //                         {
    //                             title: 'Страница 1',
    //                             key: '0-0-0-0',
    //                         },
    //                         {
    //                             title: 'Страница 2',
    //                             key: '0-0-0-1',
    //                         },
    //                         {
    //                             title: 'Страница 5',
    //                             key: '0-0-0-2',
    //                         },
    //                     ],
    //                 }
    //             ],
    //         },
    //         {
    //             title: 'Папка 2',
    //             key: '0-1',
    //             children: [
    //                 {
    //                     title: 'Документы 2',
    //                     key: '0-1-0',
    //                     children: [
    //                         {
    //                             title: 'Страница 3',
    //                             key: '0-1-0-0',
    //                         },
    //                         {
    //                             title: 'Страница 4',
    //                             key: '0-1-0-1',
    //                         },
    //                     ],
    //                 }
    //             ],
    //         },
    //     ],
    // }
];


const useBatchPanel = (): IUseBatchPanel => {
    const [treeData, setTreeData] = useState<DataNode[]>(defaultData);
    const [visible, setVisible] = useState<boolean>(false);
    const [selectedNode, setSelectedNode] = useState<DataNode | null>(null);

    const {currentBatch, isOpen, currentItem} = useSelector(({batchReducer}: RootState) => batchReducer);
    const {selectedPageId} = useSelector(({pageReducer}: RootState) => pageReducer);
    const {data: pageResult} = useGetPageQuery(selectedPageId, {skip: selectedPageId === 0});
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (isOpen) {
            onBatchChange();
        }
    }, [currentBatch]);

    useEffect(() => {
        if (pageResult && pageResult.data) {
            if (pageResult.succeeded) {
                dispatch(selectPage(pageResult.data));
                dispatch(selectItem({...currentItem, comment: pageResult.data.userComment ?? undefined}));
            } else {
                message.error(pageResult.message);
            }
        }
        if (selectedPageId === 0) {
            dispatch(clearPage());
        }
    }, [pageResult]);

    const blurBatchTreeElement = () => {
        dispatch(selectItem({}));
        dispatch(clearPage());
        dispatch(setSelectedPageId(0));
        dispatch(setSelectedPagePos('0'))
    };

    const clearBatchPanel = () => {
        blurBatchTreeElement();

        dispatch(clearBatch());
        setTreeData(defaultData)
    };

    const onBatchChange = () => {
        if (!currentBatch) {
            message.error('Не удалось прочитать пачку!');
            return;
        }

        const tree: DataNode = {
            title: currentBatch.name,
            key: `${batchLevel.batch}-${currentBatch.id}`,
            icon: <FileDoneOutlined/>,
            children: currentBatch.folders?.map((f) => ({
                title: f.label,
                key: `${batchLevel.folder}-${f.id}`,
                icon: <FolderOutlined/>,
                children: f.documents?.map((d) => ({
                    title: `${d.docNo} ${d.label}`,
                    key: `${batchLevel.documents}-${d.id}`,
                    icon: <FileTextOutlined/>,
                    children: d.pages?.map((p) => ({
                        title: `${p.label || 'Страница'} ${p.pageNo}`,
                        key: `${batchLevel.page}-${p.id}`,
                        icon: <img src={`data:image/jpeg;base64,${p.thumbnailBytes}`}
                                   alt=""
                                   className={Styles.img}/>,
                    })),
                })),
            })),
        };

        setTreeData([tree]);
        blurBatchTreeElement();
    };


    const onSelect = (selectedKeysValue: React.Key[], info: IInfo) => {
        setSelectedNode(info.node);

        if (!info.selected) {
            blurBatchTreeElement();
            return;
        }

        const getNodeData = (node: DataNode | undefined) => ({
            id: Number(node?.key.toString().split('-')[1]),
            name: node?.title?.toString() ?? '',
        });

        let comment: string | undefined | null;

        const poses = info.node.pos.split('-');
        const id = Number(info.node.key.split('-')[1]);

        switch (poses.length - 1) {
            case 1: {
                comment = currentBatch?.userComment;
                break;
            }
            case 2: {
                const folder = currentBatch?.folders.find(x => x.id === id);
                comment = folder?.userComment;

                break;
            }
            case 3: {
                const document = currentBatch?.folders[poses[2]].documents.find(x => x.id === id);
                comment = document?.userComment;

                break;
            }
            case 4: {
                break;
            }
        }

        const [_, batchIndex, folderIndex, documentIndex, pageIndex] = info.node.pos.split('-');

        const batchNode = treeData[batchIndex];
        const folderNode = batchNode?.children?.[folderIndex || 0];
        const documentNode = folderNode?.children?.[documentIndex || 0];
        const pageNode = documentNode?.children?.[pageIndex || 0];

        dispatch(setSelectedPageId(getNodeData(pageNode).id || 0));
        dispatch(setSelectedPagePos(info.node.pos))

        dispatch(selectItem({
            batch: getNodeData(batchNode) || {},
            folder: getNodeData(folderNode) || {},
            document: getNodeData(documentNode) || {},
            page: getNodeData(pageNode) || {},
            comment: comment ? comment : undefined,
            key: selectedKeysValue
        }));

    };

    const onRightClick = (info: {event: React.MouseEvent; node: EventDataNode<any>}) => {
        info.event.preventDefault();
        setSelectedNode(info.node);
        setVisible(true);
    };

    const handleMenuClick = () => {
        setVisible(false);
    };

    return {
        treeData,
        selectedNode,
        visible,
        setVisible,
        onSelect,
        onRightClick,
        handleMenuClick,
        clearBatchPanel
    };
};

export default useBatchPanel;

import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Tree } from 'antd';
import { DownOutlined,SaveOutlined } from '@ant-design/icons';
import TextArea from 'antd/lib/input/TextArea';
import { useSelector } from 'react-redux';
import { DataNode } from 'antd/lib/tree';

import useBatchPanel from './useBatchPanel';
import TreeMenu from './TreeMenu/TreeMenu';

import { RootState } from '../../../store/store';
import Styles from './BatchPanel.module.scss';
import { useAppDispatch } from '../../../store/redux';
import { setCheckedKeys } from '../../../store/reducers/batchSlice';

const {Search} = Input;

const BatchPanel: React.FC = () => {
    const {
        treeData,
        visible,
        selectedNode,
        setVisible,
        handleMenuClick,
        onSelect,
        onRightClick
    } = useBatchPanel();
    const {currentItem, currentBatch, checkedKeys} = useSelector(({batchReducer}: RootState) => batchReducer);
    const menuRef = useRef<HTMLDivElement>(null);
    const [treeDataState, setTreeDataState] = useState<DataNode[]>(treeData);
    const dispatch = useAppDispatch();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (visible && menuRef.current && !menuRef.current.contains(e.target as Node)) {

                const target = e.target as HTMLElement;
                const isTreeMenuClick = target.closest('.ant-dropdown-menu') !== null;

                if (!isTreeMenuClick) {
                    setVisible(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [visible]);

    useEffect(() => setTreeDataState(treeData), [treeData]);
    useEffect(() => {
        if (!currentBatch) setTreeDataState([]);
    }, [currentBatch]);

    //#region Перетаскивание
    const onCheck = (checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[]; }) => {
        if (Array.isArray(checked)) {
            dispatch(setCheckedKeys(checked as string[]));
        } else {
            dispatch(setCheckedKeys(checked.checked as string[]));
        }
    };

    const updatePageNames = (data: any, lvl: number = 1) => {
        data.forEach((item: any, index: number) => {

            switch (lvl) {
                case 1:
                    break;
                case 2:
                    break;
                case 3:
                    item.title = `${index + 1} ${item.title.replace(/^\d+\s/, '')}`;
                    break;
                case 4:
                    item.title = `${item.title.split(' ')[0]} ${index + 1} `;
                    break;
            }

            if (item.children) {
                updatePageNames(item.children, lvl + 1);
            }
        });
    };

    const onDrop = (info: any) => {
        const dropKey = info.node.key.toString();
        const dragKey = info.dragNode.key.toString();

        const dragLevel = dragKey.split('-')[0];
        const dropLevel = dropKey.split('-')[0];

        if (Math.abs(dragLevel - dropLevel) > 1) {
            return;
        }

        const loop = (data: any, key: any, callback: any) => {
            data.forEach((item: any, index: number, arr: any) => {
                if (item.key === key) {
                    return callback(item, index, arr);
                }
                if (item.children) {
                    return loop(item.children, key, callback);
                }
            });
        };

        const data = [...treeDataState];

        const dragObjs = checkedKeys.length > 0
            ? checkedKeys
                .filter((key) => key.toString().split('-')[0] === dragLevel)
                .map((key) => {
                    let dragObj: any;
                    loop(data, key, (item: any, index: number, arr: any) => {
                        arr.splice(index, 1);
                        dragObj = item;
                    });
                    return dragObj;
                })
            : [];

        if (dragObjs.length > 0) {
            if (dragLevel === dropLevel) {
                loop(data, dropKey, (item: any, index: number, arr: any) => {
                    const insertionIndex = index + 1;
                    arr.splice(insertionIndex, 0, ...dragObjs);
                });
            } else if (dragLevel - dropLevel === 1) {
                loop(data, dropKey, (item: any) => {
                    item.children = item.children || [];
                    item.children.push(...dragObjs);
                });
            } else {
                return;
            }

            setTreeDataState(data);
            dispatch(setCheckedKeys(dragObjs.map((obj) => obj.key)));
            updatePageNames(treeDataState);
        } else {
            const canMoveToHigherLevel = dragLevel === dropLevel;

            if (!canMoveToHigherLevel && dragLevel !== dropLevel) {
                return;
            }

            let dragObj: any;
            loop(data, dragKey, (item: any, index: number, arr: any) => {
                arr.splice(index, 1);
                dragObj = item;
            });

            if (canMoveToHigherLevel) {
                return
                // loop(data, dropKey, (item: any) => {
                //     item.children = item.children || [];
                //     item.children.push(dragObj);
                // });
            } else {
                loop(data, dropKey, (item: any, index: number, arr: any) => {
                    const insertionIndex = index + 1;
                    arr.splice(insertionIndex, 0, dragObj);
                });
            }
            setTreeDataState(data);
            updatePageNames(treeDataState);
        }
    };

    //#endregion

    return (
        
        <div className={Styles.BatchPanel}>
            <Search className={Styles.Search} placeholder="Search" bordered={false} allowClear/>
            <div ref={menuRef} className={Styles.BatchTree}>
                <TreeMenu
                    node={selectedNode}
                    handleMenuClick={handleMenuClick}
                    visible={visible}
                >
                    <Tree
                        defaultExpandAll
                        checkable
                        draggable
                        showLine
                        showIcon
                        checkStrictly

                        onCheck={onCheck}
                        onDrop={onDrop}
                        onSelect={onSelect}
                        onRightClick={onRightClick}
                        selectedKeys={currentItem?.key}

                        switcherIcon={<DownOutlined/>}
                        treeData={treeDataState}
                    />
                </TreeMenu>
            </div>
            <div className={Styles.comment}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px"
                }}>
                    <label>Комментарий:</label>
                    <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<SaveOutlined />}
                        disabled
                    >
                        Сохранить
                    </Button>
                </div>
                <TextArea
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    value={currentItem?.comment}
                    readOnly
                />
            </div>
        </div>
    );
};

export default BatchPanel;

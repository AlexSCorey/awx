import React, { useState, useEffect } from 'react';
import { Button, Modal, ToolbarItem } from '@patternfly/react-core';
import { t } from '@lingui/macro';
import { withI18n } from '@lingui/react';
import { withRouter } from 'react-router-dom';

import { getQSConfig } from '../../util/qs';
import AnsibleSelect from '../AnsibleSelect';
import VerticalSeperator from '../VerticalSeparator';
import PaginatedDataList from '../PaginatedDataList';
import DataListToolbar from '../DataListToolbar';
import CheckboxListItem from '../CheckboxListItem';
import SelectedList from '../SelectedList';

function LookupModal({
  i18n,
  count,
  error,
  required,
  columns,
  onChange,
  onToggleItem,
  lookupHeader,
  value,
  selectCategoryOptions,
  multiple,
  name,
  results,
  selectCategory,
  selectedCategory,
  qsNamespace,
  sortedColumnKey,
  history,
  isOpen,
  toggleModal,
}) {
  const [selectedItems, setSelectedItems] = useState(
    multiple ? [...value] : [value]
  );

  useEffect(() => {
    setSelectedItems(multiple ? [...value] : [value]);
  }, [value, isOpen]);

  const qsConfig = getQSConfig(qsNamespace, {
    page: 1,
    page_size: 5,
    order_by: sortedColumnKey,
  });

  const header = lookupHeader || i18n._(t`Items`);
  const canDelete = !required || (multiple && value.length > 1);

  const removeItem = row => {
    if (onToggleItem) {
      setSelectedItems(onToggleItem(selectedItems, row));
      return;
    }
    setSelectedItems(selectedItems.filter(item => item.id !== row.id));
  };

  const addItem = row => {
    if (onToggleItem) {
      setSelectedItems(onToggleItem(selectedItems, row));
      return;
    }
    const index = selectedItems.findIndex(item => item.id === row.id);

    if (!multiple) {
      setSelectedItems([row]);
      return;
    }
    if (index > -1) {
      return;
    }
    setSelectedItems([...selectedItems, row]);
  };

  const clearQSParams = () => {
    const parts = history.location.search.replace(/^\?/, '').split('&');
    const ns = qsConfig.namespace;
    const otherParts = parts.filter(param => !param.startsWith(`${ns}.`));
    history.push(`${history.location.pathname}?${otherParts.join('&')}`);
  };

  const cancelModal = () => {
    toggleModal();
  };

  const saveModal = () => {
    if (!isOpen) {
      let newSelectedItems = [];
      if (value) {
        newSelectedItems = multiple ? [...value] : [value];
      }
      setSelectedItems(newSelectedItems);
    } else {
      clearQSParams();
      if (selectCategory) {
        selectCategory(null, 'Machine');
      }
    }
    onChange(multiple ? selectedItems : selectedItems[0] || null);
    toggleModal();
  };

  return (
    <Modal
      className="awx-c-modal"
      title={i18n._(t`Select ${header}`)}
      isOpen={isOpen}
      onClose={cancelModal}
      actions={[
        <Button
          key="select"
          variant="primary"
          onClick={saveModal}
          style={selectedItems.length === 0 ? { display: 'none' } : {}}
        >
          {i18n._(t`Select`)}
        </Button>,
        <Button key="cancel" variant="secondary" onClick={cancelModal}>
          {i18n._(t`Cancel`)}
        </Button>,
      ]}
    >
      {selectCategoryOptions && selectCategoryOptions.length > 0 && (
        <ToolbarItem css=" display: flex; align-items: center;">
          <span css="flex: 0 0 25%;">Selected Category</span>
          <VerticalSeperator />
          <AnsibleSelect
            css="flex: 1 1 75%;"
            id="multiCredentialsLookUp-select"
            label="Selected Category"
            data={selectCategoryOptions}
            value={selectedCategory.label}
            onChange={selectCategory}
          />
        </ToolbarItem>
      )}
      {selectedItems.length > 0 && (
        <SelectedList
          label={i18n._(t`Selected`)}
          selected={selectedItems}
          showOverflowAfter={5}
          onRemove={removeItem}
          isReadOnly={!canDelete}
          isCredentialList={
            selectCategoryOptions && selectCategoryOptions.length > 0
          }
        />
      )}
      <PaginatedDataList
        items={results}
        itemCount={count}
        pluralizedItemName={lookupHeader}
        qsConfig={qsConfig}
        toolbarColumns={columns}
        renderItem={item => (
          <CheckboxListItem
            key={item.id}
            itemId={item.id}
            name={multiple ? item.name : name}
            label={item.name}
            isSelected={selectedItems.some(i => i.id === item.id)}
            onSelect={() => addItem(item)}
            isRadio={
              !multiple ||
              (selectCategoryOptions &&
                selectCategoryOptions.length &&
                selectedCategory.value !== 'Vault')
            }
          />
        )}
        renderToolbar={props => <DataListToolbar {...props} fillWidth />}
        showPageSizeOptions={false}
      />
      {error ? <div>error</div> : ''}
    </Modal>
  );
}

export default withI18n()(withRouter(LookupModal));
